from ..extensions import db, iso, utcnow


class ResolutionProof(db.Model):
    """Resolution evidence submitted by a field worker / officer."""

    __tablename__ = "resolution_proofs"

    id = db.Column(db.Integer, primary_key=True)
    complaint_id = db.Column(db.Integer, db.ForeignKey("complaints.id"), nullable=False, index=True)
    employee_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    notes = db.Column(db.Text, nullable=False)
    completed_at = db.Column(db.DateTime)
    completion_lat = db.Column(db.Float)
    completion_lng = db.Column(db.Float)
    client_request_id = db.Column(db.String(64), unique=True, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    complaint = db.relationship("Complaint", back_populates="proofs")
    employee = db.relationship("User")
    images = db.relationship("ComplaintImage", back_populates="proof")

    def to_dict(self):
        return {
            "id": self.id,
            "notes": self.notes,
            "description": self.notes,
            "completed_at": iso(self.completed_at or self.created_at),
            "completion_lat": self.completion_lat,
            "completion_lng": self.completion_lng,
            "employee": {"id": self.employee.id, "name": self.employee.name, "role": self.employee.role} if self.employee else None,
            "images": [image.to_dict() for image in self.images],
            "created_at": iso(self.created_at),
        }
