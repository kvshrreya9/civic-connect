from ..extensions import db, iso, utcnow


class ResolutionFeedback(db.Model):
    __tablename__ = "resolution_feedback"

    id = db.Column(db.Integer, primary_key=True)
    complaint_id = db.Column(db.Integer, db.ForeignKey("complaints.id"), nullable=False, index=True)
    citizen_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    verdict = db.Column(db.String(20), nullable=False)  # confirmed | disputed
    rating = db.Column(db.Integer)
    comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    complaint = db.relationship("Complaint", back_populates="feedback")

    def to_dict(self):
        return {
            "id": self.id,
            "verdict": self.verdict,
            "rating": self.rating,
            "comment": self.comment,
            "created_at": iso(self.created_at),
        }
