from ..extensions import db, iso, utcnow


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    complaint_id = db.Column(db.Integer, db.ForeignKey("complaints.id"), index=True)
    title = db.Column(db.String(160), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(30), nullable=False, default="info")
    is_read = db.Column(db.Boolean, nullable=False, default=False, index=True)
    # Idempotency: the same event never creates two notifications for the same person.
    dedupe_key = db.Column(db.String(160), unique=True, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow, index=True)

    complaint = db.relationship("Complaint")

    def to_dict(self):
        return {
            "id": self.id,
            "complaint_id": self.complaint_id,
            "complaint_reference": self.complaint.reference if self.complaint else None,
            "title": self.title,
            "message": self.message,
            "type": self.type,
            "is_read": self.is_read,
            "created_at": iso(self.created_at),
        }
