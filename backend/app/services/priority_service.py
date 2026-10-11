import math

from flask import current_app

from ..extensions import db, utcnow
from ..models import Complaint, OPEN_STATUSES, RESOLVED_STATUSES
from ..utils.validators import CATEGORIES, SEVERITIES, parse_bool, parse_int
from . import location_service, sla_service

SEVERITY_POINTS = {"low": 8, "medium": 16, "high": 24, "critical": 30}
WEIGHTS = {"severity": 30, "safety": 20, "affected": 20, "nearby": 15, "time": 15}


def compute_score(*, severity, safety_risk, affected_count, support_count, nearby_count, hours_open, sla_hours):
    """Transparent 0-100 score built from five capped, explainable factors."""
    severity_pts = SEVERITY_POINTS.get(severity, 16)
    safety_pts = WEIGHTS["safety"] if safety_risk else 0
    people = max(0, int(affected_count or 0)) + max(0, int(support_count or 0))
    affected_pts = min(WEIGHTS["affected"], int(round(WEIGHTS["affected"] * math.log10(1 + people) / math.log10(101))))
    nearby_pts = min(WEIGHTS["nearby"], int(nearby_count or 0) * 5)
    ratio = (hours_open / sla_hours) if sla_hours else 0
    time_pts = min(WEIGHTS["time"], int(round(WEIGHTS["time"] * max(ratio, 0))))
    total = min(100, severity_pts + safety_pts + affected_pts + nearby_pts + time_pts)
    factors = [
        {"key": "severity", "label": "Severity", "points": severity_pts, "max": WEIGHTS["severity"],
         "detail": f"{severity.capitalize() if severity else 'Medium'} severity"},
        {"key": "safety", "label": "Safety risk", "points": safety_pts, "max": WEIGHTS["safety"],
         "detail": "Immediate danger to the public" if safety_risk else "No immediate danger reported"},
        {"key": "affected", "label": "Affected citizens", "points": affected_pts, "max": WEIGHTS["affected"],
         "detail": f"{people} people affected or supporting"},
        {"key": "nearby", "label": "Related nearby reports", "points": nearby_pts, "max": WEIGHTS["nearby"],
         "detail": f"{nearby_count} open similar reports within {current_app.config['PRIORITY_NEARBY_RADIUS_M']} m"},
        {"key": "time", "label": "Time unresolved", "points": time_pts, "max": WEIGHTS["time"],
         "detail": f"{round(hours_open, 1)} h of a {sla_hours} h target"},
    ]
    return total, {"total": total, "factors": factors, "formula": "severity + safety + affected + nearby + time (max 100)"}


def nearby_related_count(latitude, longitude, category, exclude_id=None):
    return len(
        location_service.nearby_complaints(
            latitude, longitude, current_app.config["PRIORITY_NEARBY_RADIUS_M"],
            category=category, exclude_id=exclude_id, statuses=OPEN_STATUSES,
        )
    )


def calculate_for(complaint):
    created = complaint.created_at or utcnow()
    end = complaint.resolved_at if complaint.status in RESOLVED_STATUSES and complaint.resolved_at else utcnow()
    hours_open = max(0.0, (end - created).total_seconds() / 3600.0)
    return compute_score(
        severity=complaint.severity,
        safety_risk=complaint.safety_risk,
        affected_count=complaint.affected_count,
        support_count=complaint.support_count,
        nearby_count=nearby_related_count(complaint.latitude, complaint.longitude, complaint.category, complaint.id),
        hours_open=hours_open,
        sla_hours=sla_service.sla_hours_for(complaint.category, complaint.severity, complaint.department),
    )


def update_priority(complaint):
    score, breakdown = calculate_for(complaint)
    complaint.priority_score = score
    complaint.priority_breakdown = breakdown
    return score


def preview(data):
    severity = (data.get("severity") or "medium").lower()
    category = (data.get("category") or "other").lower()
    if severity not in SEVERITIES:
        severity = "medium"
    if category not in CATEGORIES:
        category = "other"
    nearby = 0
    try:
        lat, lng = float(data.get("latitude")), float(data.get("longitude"))
        nearby = nearby_related_count(lat, lng, category)
    except (TypeError, ValueError):
        pass
    score, breakdown = compute_score(
        severity=severity,
        safety_risk=parse_bool(data.get("safety_risk")),
        affected_count=parse_int(data.get("affected_count"), default=0, minimum=0),
        support_count=0,
        nearby_count=nearby,
        hours_open=0,
        sla_hours=sla_service.sla_hours_for(category, severity),
    )
    breakdown["nearby_count"] = nearby
    breakdown["severity"] = severity
    return score, breakdown


def recalculate_open():
    from . import location_service, risk_service

    complaints = Complaint.query.filter(Complaint.status.in_(OPEN_STATUSES)).all()
    for complaint in complaints:
        location_service.refresh_related_counts(complaint)
        update_priority(complaint)
        risk_service.evaluate(complaint)
    # Backfill risk for older closed records (no alerts are raised for closed complaints).
    for complaint in Complaint.query.filter(Complaint.risk_level.is_(None)).all():
        location_service.refresh_related_counts(complaint)
        risk_service.evaluate(complaint)
    db.session.commit()
    return len(complaints)
