"""Backend-generated High / Critical risk alerts, routed to the responsible office."""
from datetime import timedelta

from flask import current_app

from ..extensions import db, utcnow
from ..models import AuditLog, RiskAlert
from ..utils.permissions import can_manage_complaint
from ..utils.validators import ApiError, clean_text
from . import after_commit, audit_service, external_notifier, notification_service


def _response_minutes(complaint, level):
    office = complaint.office
    cfg = current_app.config
    if level == "critical":
        return (office.critical_response_minutes if office else None) or cfg["DEFAULT_CRITICAL_RESPONSE_MINUTES"]
    return (office.high_response_minutes if office else None) or cfg["DEFAULT_HIGH_RESPONSE_MINUTES"]


def _create(complaint, kind, level, previous=None, actor=None):
    dedupe_key = f"complaint:{complaint.id}:{kind}:{level}"
    pending = db.session.info.setdefault("pending_alert_keys", set())
    if dedupe_key in pending or RiskAlert.query.filter_by(dedupe_key=dedupe_key).first():
        return None
    pending.add(dedupe_key)
    alert = RiskAlert(
        complaint=complaint,
        office_id=complaint.office_id,
        risk_level=level,
        previous_level=previous,
        kind=kind,
        dedupe_key=dedupe_key,
        priority_score=complaint.priority_score,
        response_due_at=utcnow() + timedelta(minutes=_response_minutes(complaint, level)),
    )
    db.session.add(alert)
    db.session.flush()
    label = {"critical": "CRITICAL", "high": "HIGH"}.get(level, level.upper())
    title = (f"Risk escalated to {label}" if kind == "escalation" else f"{label}-risk complaint received")
    where = complaint.address or f"{complaint.latitude:.5f}, {complaint.longitude:.5f}"
    message = (f"{complaint.reference} · {complaint.category.replace('_', ' ')} · priority {complaint.priority_score} · {where}")
    notification_service.notify_responsible(
        complaint, title, message, "escalation" if kind == "escalation" else "risk_alert",
        dedupe_key=f"alert:{alert.id}",
    )
    audit_service.record("alert.created", "alert", alert.id, actor=actor, complaint=complaint,
                         kind=kind, risk_level=level, previous_level=previous, office_id=complaint.office_id)
    recipients = notification_service.office_officers(complaint.office_id) if complaint.office_id else []
    if level == "critical" or not complaint.office_id:
        recipients.extend(notification_service.admins())
    if level == "critical":
        for administrator in notification_service.admins():
            notification_service.notify(
                administrator.id, title, message,
                "escalation" if kind == "escalation" else "risk_alert",
                complaint.id, dedupe_key=f"alert:{alert.id}",
            )
    after_commit.defer(
        external_notifier.send_alert, alert.id,
        [(u.id, u.email, u.phone) for u in recipients], f"[CivicConnect] {title}", message,
        call_recipients=(
            [(f"office:{complaint.office_id}", complaint.office.critical_alert_phone)]
            if level == "critical" and kind == "critical" and complaint.office_id
            and complaint.office and complaint.office.critical_alert_phone
            else (
                [(u.id, u.phone) for u in notification_service.admins() if u.phone]
                if level == "critical" and kind == "critical" and not complaint.office_id else []
            )
        ),
    )
    return alert


def handle_risk_change(complaint, previous, level, actor=None):
    created = []
    if level in ("high", "critical"):
        alert = _create(complaint, "critical" if level == "critical" else "high_risk", level, previous, actor)
        if alert:
            created.append(alert)
    if previous == "high" and level == "critical":
        alert = _create(complaint, "escalation", "critical", previous, actor)
        if alert:
            created.append(alert)
    return created


def on_office_changed(complaint, previous_office_id, actor=None):
    """Move open alerts to the new office and notify the newly responsible officers."""
    open_alerts = RiskAlert.query.filter(
        RiskAlert.complaint_id == complaint.id, RiskAlert.status == "open"
    ).all()
    for alert in open_alerts:
        alert.office_id = complaint.office_id
        audit_service.record("alert.office_changed", "alert", alert.id, actor=actor, complaint=complaint,
                             from_office_id=previous_office_id, to_office_id=complaint.office_id)
    if open_alerts:
        notification_service.notify_office(
            complaint.office_id, "Open risk alert transferred to your office",
            f"{complaint.reference} ({(complaint.risk_level or '').upper()}) now belongs to your office.",
            "risk_alert", complaint.id, dedupe_key=f"alert-transfer:{complaint.id}:{complaint.office_id}",
        )


def _can_act(user, alert):
    if user.role == "admin":
        return True
    return can_manage_complaint(user, alert.complaint)


def get_alert_or_404(alert_id, user):
    alert = db.session.get(RiskAlert, alert_id)
    if not alert or not _can_act(user, alert):
        raise ApiError("Alert not found", 404)
    return alert


def acknowledge(alert, user, note=None):
    if alert.status != "open":
        return alert
    alert.status = "acknowledged"
    alert.acknowledged_by_id = user.id
    alert.acknowledged_at = utcnow()
    alert.acknowledgement_note = clean_text(note, 1000) or None
    audit_service.record("alert.acknowledged", "alert", alert.id, actor=user, complaint_id=alert.complaint_id,
                         note=alert.acknowledgement_note)
    db.session.commit()
    return alert


def add_action(alert, user, note):
    note = clean_text(note, 1000)
    if len(note) < 3:
        raise ApiError("Describe the action taken", 422)
    audit_service.record("alert.action", "alert", alert.id, actor=user, complaint_id=alert.complaint_id, note=note)
    db.session.commit()
    return alert


def actions_for(alert_ids):
    if not alert_ids:
        return {}
    rows = (AuditLog.query.filter(AuditLog.entity_type == "alert", AuditLog.entity_id.in_(alert_ids))
            .order_by(AuditLog.created_at.asc(), AuditLog.id.asc()).all())
    grouped = {}
    for row in rows:
        grouped.setdefault(row.entity_id, []).append(row.to_dict())
    return grouped


def list_alerts(user, args):
    from ..models import Complaint
    from ..utils.validators import pagination_args, parse_date

    query = RiskAlert.query.join(Complaint, RiskAlert.complaint_id == Complaint.id)
    if user.role != "admin":
        if user.office_id:
            query = query.filter(RiskAlert.office_id == user.office_id)
            if user.ward_id:
                query = query.filter(Complaint.ward_id == user.ward_id)
        elif user.department_id:
            query = query.filter(Complaint.department_id == user.department_id)
        else:
            query = query.filter(RiskAlert.id == -1)
    elif args.get("office_id"):
        query = query.filter(RiskAlert.office_id == int(args["office_id"]))
    risk = [r for r in (args.get("risk") or "").split(",") if r in ("high", "critical")]
    if risk:
        query = query.filter(RiskAlert.risk_level.in_(risk))
    status = args.get("status")
    if status in ("open", "acknowledged", "closed"):
        query = query.filter(RiskAlert.status == status)
    if args.get("ward_id"):
        query = query.filter(Complaint.ward_id == int(args["ward_id"]))
    if args.get("complaint_status"):
        query = query.filter(Complaint.status.in_(args["complaint_status"].split(",")))
    date_from, date_to = parse_date(args.get("date_from")), parse_date(args.get("date_to"), end=True)
    if date_from:
        query = query.filter(RiskAlert.created_at >= date_from)
    if date_to:
        query = query.filter(RiskAlert.created_at <= date_to)
    page, per_page = pagination_args(args, default_per_page=20)
    query = query.order_by((RiskAlert.status == "open").desc(), RiskAlert.created_at.desc(), RiskAlert.id.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    actions = actions_for([a.id for a in pagination.items])
    return {
        "items": [a.to_dict(actions.get(a.id)) for a in pagination.items],
        "total": pagination.total,
        "page": page,
        "pages": max(1, pagination.pages),
    }


def unacknowledged_count(user):
    from ..models import Complaint

    query = RiskAlert.query.join(Complaint, RiskAlert.complaint_id == Complaint.id).filter(RiskAlert.status == "open")
    if user.role != "admin":
        if user.office_id:
            query = query.filter(RiskAlert.office_id == user.office_id)
        elif user.department_id:
            query = query.filter(Complaint.department_id == user.department_id)
        else:
            return 0
    return query.count()
