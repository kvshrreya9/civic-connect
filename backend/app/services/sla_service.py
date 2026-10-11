from datetime import timedelta

from flask import current_app

from ..extensions import db, utcnow
from ..models import Complaint, ComplaintStatus, OPEN_STATUSES, RESOLVED_STATUSES

# Base resolution targets (hours) per category. Severity scales the target.
SLA_RULES = {
    "pothole": 72,
    "road_damage": 120,
    "garbage": 24,
    "water_leakage": 24,
    "drainage": 48,
    "streetlight": 72,
    "tree_hazard": 48,
    "other": 96,
}
SEVERITY_MULTIPLIER = {"critical": 0.5, "high": 0.75, "medium": 1.0, "low": 1.5}
AT_RISK_FRACTION = 0.75


def sla_hours_for(category, severity, department=None):
    base = SLA_RULES.get(category)
    if base is None:
        base = department.sla_hours if department and department.sla_hours else 96
    return max(4, int(round(base * SEVERITY_MULTIPLIER.get(severity, 1.0))))


def compute_due(category, severity, created_at=None, department=None):
    return (created_at or utcnow()) + timedelta(hours=sla_hours_for(category, severity, department))


def sla_status(complaint):
    if not complaint.sla_due_at:
        return None
    created = complaint.created_at or utcnow()
    due = complaint.sla_due_at
    total_hours = max((due - created).total_seconds() / 3600.0, 0.01)
    base = {"due_at": due.replace(microsecond=0).isoformat() + "Z", "target_hours": round(total_hours, 1)}

    if complaint.status == "rejected":
        return {**base, "state": "closed", "hours_remaining": None, "percent_elapsed": None, "overdue": False}
    if complaint.status in RESOLVED_STATUSES and complaint.resolved_at:
        state = "met" if complaint.resolved_at <= due else "breached"
        taken = (complaint.resolved_at - created).total_seconds() / 3600.0
        return {**base, "state": state, "hours_remaining": None, "overdue": False,
                "percent_elapsed": round(min(taken / total_hours, 9.99) * 100)}

    now = utcnow()
    elapsed = (now - created).total_seconds() / 3600.0
    remaining = (due - now).total_seconds() / 3600.0
    fraction = elapsed / total_hours
    if remaining < 0:
        state = "overdue"
    elif fraction >= AT_RISK_FRACTION:
        state = "at_risk"
    else:
        state = "on_track"
    return {**base, "state": state, "hours_remaining": round(remaining, 1), "overdue": remaining < 0,
            "percent_elapsed": round(min(fraction, 9.99) * 100)}


def check_deadline_warnings():
    """Notify responsible officers once when a deadline is approaching."""
    from . import notification_service

    now = utcnow()
    horizon = now + timedelta(hours=current_app.config["DEADLINE_WARNING_HOURS"])
    upcoming = Complaint.query.filter(
        Complaint.status.in_(OPEN_STATUSES), Complaint.sla_due_at.isnot(None),
        Complaint.sla_due_at >= now, Complaint.sla_due_at <= horizon,
    ).all()
    for complaint in upcoming:
        notification_service.notify_responsible(
            complaint, "Deadline approaching",
            f"{complaint.reference} is due {complaint.sla_due_at.strftime('%d %b %H:%M')} UTC.",
            "deadline", dedupe_key=f"deadline-warning:{complaint.id}:{complaint.sla_due_at.isoformat()}",
        )
        if complaint.assigned_to_id:
            notification_service.notify(
                complaint.assigned_to_id, "Deadline approaching",
                f"{complaint.reference} is due soon.", "deadline", complaint.id,
                dedupe_key=f"deadline-warning:{complaint.id}:{complaint.sla_due_at.isoformat()}",
            )
    db.session.commit()
    return len(upcoming)


def check_escalations():
    """Flag overdue open complaints, notify stakeholders and re-evaluate priority/risk. Returns count escalated."""
    from . import audit_service, notification_service, priority_service, risk_service

    now = utcnow()
    overdue = Complaint.query.filter(
        Complaint.status.in_(OPEN_STATUSES),
        Complaint.sla_due_at.isnot(None),
        Complaint.sla_due_at < now,
        Complaint.escalated.is_(False),
    ).all()
    for complaint in overdue:
        complaint.escalated = True
        complaint.escalation_reason = "SLA breached - resolution deadline passed"
        db.session.add(
            ComplaintStatus(
                complaint=complaint, from_status=complaint.status, to_status=complaint.status,
                note="Automatically escalated: resolution deadline passed.", is_internal=True,
            )
        )
        audit_service.record("complaint.overdue_escalated", "complaint", complaint.id, complaint=complaint)
        notification_service.notify(
            complaint.citizen_id, "Your complaint has been escalated",
            f"{complaint.reference} passed its resolution deadline and was escalated for urgent attention.",
            "escalation", complaint.id, dedupe_key=f"overdue-citizen:{complaint.id}",
        )
        notification_service.notify_responsible(
            complaint, "Complaint overdue",
            f"{complaint.reference} ({complaint.title}) is overdue and has been escalated.",
            "overdue", dedupe_key=f"overdue:{complaint.id}",
        )
        priority_service.update_priority(complaint)
        risk_service.evaluate(complaint)
    db.session.commit()
    return len(overdue)
