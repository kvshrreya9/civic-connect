from ..extensions import db, iso, utcnow

ALERT_KINDS = ("high_risk", "critical", "escalation")


class RiskAlert(db.Model):
    """Persistent alert for High / Critical complaints, routed to the responsible office."""

    __tablename__ = "risk_alerts"

    id = db.Column(db.Integer, primary_key=True)
    complaint_id = db.Column(db.Integer, db.ForeignKey("complaints.id"), nullable=False, index=True)
    office_id = db.Column(db.Integer, db.ForeignKey("offices.id"), index=True)
    risk_level = db.Column(db.String(10), nullable=False)
    previous_level = db.Column(db.String(10))
    kind = db.Column(db.String(20), nullable=False)
    dedupe_key = db.Column(db.String(120), nullable=False, unique=True, index=True)
    status = db.Column(db.String(20), nullable=False, default="open", index=True)  # open | acknowledged | closed
    priority_score = db.Column(db.Integer)
    response_due_at = db.Column(db.DateTime)
    acknowledged_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    acknowledged_at = db.Column(db.DateTime)
    acknowledgement_note = db.Column(db.Text)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow, index=True)

    complaint = db.relationship("Complaint")
    office = db.relationship("Office")
    acknowledged_by = db.relationship("User")

    def to_dict(self, actions=None):
        from .complaint import OPEN_STATUSES

        c = self.complaint
        overdue = bool(self.status == "open" and self.response_due_at and self.response_due_at < utcnow())
        return {
            "id": self.id,
            "kind": self.kind,
            "risk_level": self.risk_level,
            "previous_level": self.previous_level,
            "status": self.status,
            "acknowledged": self.status != "open",
            "response_overdue": overdue,
            "priority_score": self.priority_score,
            "response_due_at": iso(self.response_due_at),
            "acknowledged_at": iso(self.acknowledged_at),
            "acknowledged_by": self.acknowledged_by.to_brief() if self.acknowledged_by else None,
            "acknowledgement_note": self.acknowledgement_note,
            "office": self.office.to_brief() if self.office else None,
            "complaint": {
                "id": c.id,
                "reference": c.reference,
                "title": c.title,
                "category": c.category,
                "status": c.status,
                "is_open": c.status in OPEN_STATUSES,
                "risk_level": c.risk_level,
                "priority_score": c.priority_score,
                "address": c.address,
                "ward": c.ward.to_brief() if c.ward else None,
                "latitude": c.latitude,
                "longitude": c.longitude,
                "assigned_to": c.assigned_to.to_brief() if c.assigned_to else None,
                "created_at": iso(c.created_at),
            } if c else None,
            "actions": actions or [],
            "created_at": iso(self.created_at),
        }
