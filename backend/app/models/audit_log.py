from ..extensions import db, iso, utcnow


class AuditLog(db.Model):
    """Append-only record of important actions (assignment, status, evidence, alerts, admin changes)."""

    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    actor_id = db.Column(db.Integer, db.ForeignKey("users.id"), index=True)
    action = db.Column(db.String(60), nullable=False, index=True)
    entity_type = db.Column(db.String(40), nullable=False)
    entity_id = db.Column(db.Integer)
    complaint_id = db.Column(db.Integer, db.ForeignKey("complaints.id"), index=True)
    details = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow, index=True)

    actor = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "action": self.action,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "complaint_id": self.complaint_id,
            "details": self.details or {},
            "actor": self.actor.to_brief() if self.actor else {"name": "System", "role": "system"},
            "created_at": iso(self.created_at),
        }
