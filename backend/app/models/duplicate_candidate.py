from ..extensions import db, iso, utcnow


class DuplicateCandidate(db.Model):
    """A possible duplicate pairing. Reports are never discarded automatically."""

    __tablename__ = "duplicate_candidates"
    __table_args__ = (db.UniqueConstraint("complaint_id", "candidate_id", name="uq_duplicate_pair"),)

    id = db.Column(db.Integer, primary_key=True)
    complaint_id = db.Column(db.Integer, db.ForeignKey("complaints.id"), nullable=False, index=True)
    candidate_id = db.Column(db.Integer, db.ForeignKey("complaints.id"), nullable=False, index=True)
    score = db.Column(db.Float, nullable=False)
    distance_m = db.Column(db.Float)
    text_similarity = db.Column(db.Float)
    image_similarity = db.Column(db.Float)
    status = db.Column(db.String(20), nullable=False, default="pending")  # pending | confirmed | rejected
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    complaint = db.relationship("Complaint", foreign_keys=[complaint_id])
    candidate = db.relationship("Complaint", foreign_keys=[candidate_id])

    def to_dict(self):
        return {
            "id": self.id,
            "complaint_id": self.complaint_id,
            "candidate": self.candidate.summary() if self.candidate else None,
            "score": round(self.score, 3),
            "distance_m": self.distance_m,
            "text_similarity": self.text_similarity,
            "image_similarity": self.image_similarity,
            "status": self.status,
            "created_at": iso(self.created_at),
        }
