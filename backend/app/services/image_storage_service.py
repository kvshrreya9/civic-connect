import io
import os
import uuid
from dataclasses import dataclass

from flask import current_app
from PIL import Image, ImageOps
from werkzeug.utils import secure_filename

from ..extensions import db
from ..models import ComplaintImage, StoredImage
from ..utils.image_utils import compute_dhash, ensure_rgb, load_image
from ..utils.security import is_safe_stored_filename
from ..utils.validators import ApiError
from . import image_privacy_service


@dataclass
class ProcessedImage:
    image: Image.Image
    original_name: str
    original_size: int
    faces_blurred: int
    phash: str


def _use_database():
    return current_app.config.get("IMAGE_STORAGE", "disk") == "database"


def process_upload(file_storage):
    """Validate, orient, resize, privacy-protect and hash an upload (nothing written yet)."""
    max_bytes = current_app.config["MAX_IMAGE_BYTES"]
    raw = file_storage.read()
    if not raw:
        raise ApiError("Empty image upload", 400)
    if len(raw) > max_bytes:
        raise ApiError(f"Each image must be under {max_bytes // (1024 * 1024)} MB", 413)
    image, _ = load_image(raw)
    image = ImageOps.exif_transpose(image)
    image = ensure_rgb(image)
    max_dim = current_app.config["IMAGE_MAX_DIMENSION"]
    image.thumbnail((max_dim, max_dim), Image.LANCZOS)
    image, faces = image_privacy_service.protect(image)
    return ProcessedImage(
        image=image,
        original_name=file_storage.filename or "upload.jpg",
        original_size=len(raw),
        faces_blurred=faces,
        phash=compute_dhash(image),
    )


def save_processed(processed, complaint, kind, uploaded_by=None, proof=None):
    # Resolution evidence is stored separately from citizens' original photos.
    subfolder = "resolution" if kind == "resolution" else "report"
    filename = f"{subfolder}/{uuid.uuid4().hex}.jpg"
    buffer = io.BytesIO()
    processed.image.save(
        buffer, "JPEG", quality=current_app.config["IMAGE_JPEG_QUALITY"], optimize=True, progressive=True
    )
    data = buffer.getvalue()
    if _use_database():
        # Saved in the same transaction as the complaint, so both exist or neither does.
        db.session.add(StoredImage(filename=filename, data=data))
    else:
        folder = os.path.join(current_app.config["UPLOAD_FOLDER"], subfolder)
        os.makedirs(folder, exist_ok=True)
        path = os.path.join(folder, filename.split("/", 1)[1])
        with open(path, "wb") as handle:
            handle.write(data)
    record = ComplaintImage(
        complaint=complaint,
        proof=proof,
        kind=kind,
        filename=filename,
        original_name=(secure_filename(processed.original_name) or "upload.jpg")[:255],
        content_type="image/jpeg",
        width=processed.image.width,
        height=processed.image.height,
        size_bytes=len(data),
        phash=processed.phash,
        faces_blurred=processed.faces_blurred > 0,
        uploaded_by_id=uploaded_by.id if uploaded_by else None,
    )
    db.session.add(record)
    return record


def process_many(files, max_images=None):
    max_images = max_images or current_app.config["MAX_IMAGES_PER_COMPLAINT"]
    files = [f for f in files if f and f.filename]
    if len(files) > max_images:
        raise ApiError(f"You can attach up to {max_images} images", 400)
    return [process_upload(f) for f in files]


def resolve_path(filename):
    if not is_safe_stored_filename(filename):
        return None
    path = os.path.join(current_app.config["UPLOAD_FOLDER"], *filename.split("/"))
    return path if os.path.isfile(path) else None


def read_bytes(filename):
    """Return the stored JPEG bytes (database first, then disk for older uploads), or None."""
    if not is_safe_stored_filename(filename):
        return None
    row = db.session.get(StoredImage, filename)
    if row is not None:
        return bytes(row.data)
    path = resolve_path(filename)
    if path:
        with open(path, "rb") as handle:
            return handle.read()
    return None


def delete_file(filename):
    removed = False
    if is_safe_stored_filename(filename):
        if StoredImage.query.filter_by(filename=filename).delete(synchronize_session=False):
            db.session.commit()
            removed = True
    path = resolve_path(filename)
    if path:
        os.remove(path)
        removed = True
    return removed
