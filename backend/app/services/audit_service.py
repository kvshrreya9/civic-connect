from ..extensions import db
from ..models import AuditLog


def record(action, entity_type, entity_id=None, actor=None, complaint=None, complaint_id=None, **details):
    entry = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        actor_id=actor.id if actor else None,
        complaint_id=complaint.id if complaint is not None else complaint_id,
        details={k: v for k, v in details.items() if v is not None},
    )
    db.session.add(entry)
    return entry


def for_complaint(complaint_id, limit=200):
    return (
        AuditLog.query.filter_by(complaint_id=complaint_id)
        .order_by(AuditLog.created_at.asc(), AuditLog.id.asc())
        .limit(limit)
        .all()
    )
