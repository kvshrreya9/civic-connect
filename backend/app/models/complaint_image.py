from ..extensions import db, iso, utcnow


class ComplaintImage(db.Model):
    __tablename__ = "complaint_images"

    id = db.Column(db.Integer, primary_key=True)
    complaint_id = db.Column(db.Integer, db.ForeignKey("complaints.id"), nullable=False, index=True)
    proof_id = db.Column(db.Integer, db.ForeignKey("resolution_proofs.id"), index=True)
    kind = db.Column(db.String(20), nullable=False, default="report")  # report | resolution
    # report/<hex>.jpg or resolution/<hex>.jpg (legacy rows: <hex>.jpg)
    filename = db.Column(db.String(64), unique=True, nullable=False)
    original_name = db.Column(db.String(255))
    content_type = db.Column(db.String(50), nullable=False, default="image/jpeg")
    width = db.Column(db.Integer)
    height = db.Column(db.Integer)
    size_bytes = db.Column(db.Integer)
    phash = db.Column(db.String(16), index=True)
    faces_blurred = db.Column(db.Boolean, nullable=False, default=False)
    uploaded_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    complaint = db.relationship("Complaint", back_populates="images")
    proof = db.relationship("ResolutionProof", back_populates="images")

    @property
    def url(self):
        """Short-lived signed URL; images are only served to people allowed to see the complaint."""
        from ..utils.security import signed_image_url

        return signed_image_url(self.filename)

    def to_dict(self):
        return {
            "id": self.id,
            "kind": self.kind,
            "url": self.url,
            "width": self.width,
            "height": self.height,
            "size_bytes": self.size_bytes,
            "faces_blurred": self.faces_blurred,
            "created_at": iso(self.created_at),
        }
