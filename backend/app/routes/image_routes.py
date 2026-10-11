import os

from flask import Blueprint, jsonify, request, send_file

from ..services import image_storage_service
from ..utils.permissions import login_required
from ..utils.security import is_safe_stored_filename, verify_image_token
from ..utils.validators import ApiError

bp = Blueprint("images", __name__, url_prefix="/api/images")


@bp.get("/<path:filename>")
def serve_image(filename):
    """Images are only served with a valid, short-lived signature. Signed URLs are issued
    exclusively to the reporting citizen and authorised staff (see Complaint.to_dict)."""
    if not is_safe_stored_filename(filename):
        raise ApiError("Image not found", 404)
    if not verify_image_token(filename, request.args.get("t")):
        raise ApiError("This image link is invalid or has expired", 403)
    path = image_storage_service.resolve_path(filename)
    if not path:
        raise ApiError("Image not found", 404)
    response = send_file(os.path.abspath(path), mimetype="image/jpeg", max_age=3600)
    response.headers["Content-Security-Policy"] = "default-src 'none'"
    response.headers["Cache-Control"] = "private, max-age=3600"
    return response


@bp.post("/validate")
@login_required
def validate():
    upload = request.files.get("image")
    if not upload:
        raise ApiError("Attach an image in the 'image' field", 422)
    processed = image_storage_service.process_upload(upload)
    return jsonify({
        "valid": True, "width": processed.image.width, "height": processed.image.height,
        "original_size": processed.original_size, "hash": processed.phash, "faces_blurred": processed.faces_blurred,
    })
