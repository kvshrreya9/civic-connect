from ..extensions import db, iso, utcnow


class ComplaintStatus(db.Model):
    """Status history / audit trail. Internal entries are staff-only notes."""

    __tablename__ = "complaint_status_history"

    id = db.Column(db.Integer, primary_key=True)
    complaint_id = db.Column(db.Integer, db.ForeignKey("complaints.id"), nullable=False, index=True)
    from_status = db.Column(db.String(20))
    to_status = db.Column(db.String(20), nullable=False)
    note = db.Column(db.Text)
    is_internal = db.Column(db.Boolean, nullable=False, default=False)
    changed_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    complaint = db.relationship("Complaint", back_populates="history")
    changed_by = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "from_status": self.from_status,
            "to_status": self.to_status,
            "note": self.note,
            "is_internal": self.is_internal,
            "changed_by": (
                {"name": self.changed_by.name, "role": self.changed_by.role} if self.changed_by else {"name": "System", "role": "system"}
            ),
            "created_at": iso(self.created_at),
        }
