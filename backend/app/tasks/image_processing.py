"""Maintenance jobs for stored complaint images."""
import os

from flask import current_app
from PIL import Image

from ..extensions import db
from ..models import ComplaintImage
from ..utils.image_utils import compute_dhash
from ..utils.security import is_safe_stored_filename


def backfill_missing_hashes():
    """Compute perceptual hashes for images saved before hashing was enabled."""
    updated = 0
    folder = current_app.config["UPLOAD_FOLDER"]
    for record in ComplaintImage.query.filter(ComplaintImage.phash.is_(None)).all():
        path = os.path.join(folder, *record.filename.split("/"))
        if not os.path.isfile(path):
            continue
        with Image.open(path) as image:
            record.phash = compute_dhash(image)
            record.width, record.height = image.size
        updated += 1
    db.session.commit()
    return updated


def cleanup_orphan_files(dry_run=True):
    """List (or delete) stored files that no database row references."""
    folder = current_app.config["UPLOAD_FOLDER"]
    if not os.path.isdir(folder):
        return []
    known = {row.filename for row in ComplaintImage.query.with_entities(ComplaintImage.filename).all()}
    stored = []
    for root, _, files in os.walk(folder):
        rel_root = os.path.relpath(root, folder)
        for name in files:
            rel = name if rel_root == "." else f"{rel_root.replace(os.sep, '/')}/{name}"
            if is_safe_stored_filename(rel):
                stored.append(rel)
    orphans = [name for name in stored if name not in known]
    if not dry_run:
        for name in orphans:
            os.remove(os.path.join(folder, *name.split("/")))
    return orphans
