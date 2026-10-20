from ..extensions import db, utcnow


class StoredImage(db.Model):
    """Image bytes kept in the database, so uploads survive restarts and redeploys on hosts
    whose local disk is wiped (for example free-tier web services)."""

    __tablename__ = "stored_images"

    # Same value as ComplaintImage.filename, e.g. report/<hex>.jpg
    filename = db.Column(db.String(64), primary_key=True)
    data = db.Column(db.LargeBinary, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)
