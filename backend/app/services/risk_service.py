"""Transparent, rule-based risk classification (not machine learning).

points = severity (low 0, medium 1, high 2, critical 3)
       + 2 if immediate safety risk
       + 1 if affected citizens >= RISK_AFFECTED_THRESHOLD (default 50)
       + 1 if related nearby reports >= RISK_RELATED_THRESHOLD (default 3)
       + 1 if the resolution deadline has passed while still open
level  = Critical >= 5, High >= 3, Medium >= 2, otherwise Low   (thresholds configurable)
"""
from flask import current_app

from ..extensions import utcnow
from ..models import OPEN_STATUSES, RISK_RANK

SEVERITY_POINTS = {"low": 0, "medium": 1, "high": 2, "critical": 3}


def classify_points(points):
    cfg = current_app.config
    if points >= cfg["RISK_CRITICAL_POINTS"]:
        return "critical"
    if points >= cfg["RISK_HIGH_POINTS"]:
        return "high"
    if points >= cfg["RISK_MEDIUM_POINTS"]:
        return "medium"
    return "low"


def compute(complaint):
    cfg = current_app.config
    overdue = bool(
        complaint.status in OPEN_STATUSES and complaint.sla_due_at and complaint.sla_due_at < utcnow()
    )
    factors = [
        {"key": "severity", "label": "Severity", "points": SEVERITY_POINTS.get(complaint.severity, 1),
         "detail": f"{(complaint.severity or 'medium').capitalize()} severity"},
        {"key": "safety", "label": "Safety risk", "points": 2 if complaint.safety_risk else 0,
         "detail": "Immediate danger reported" if complaint.safety_risk else "No immediate danger"},
        {"key": "affected", "label": "Affected citizens",
         "points": 1 if (complaint.affected_count or 0) >= cfg["RISK_AFFECTED_THRESHOLD"] else 0,
         "detail": f"{complaint.affected_count or 0} affected (threshold {cfg['RISK_AFFECTED_THRESHOLD']})"},
        {"key": "related", "label": "Related nearby reports",
         "points": 1 if (complaint.related_count or 0) >= cfg["RISK_RELATED_THRESHOLD"] else 0,
         "detail": f"{complaint.related_count or 0} related reports (threshold {cfg['RISK_RELATED_THRESHOLD']})"},
        {"key": "overdue", "label": "Time unresolved", "points": 1 if overdue else 0,
         "detail": "Past its resolution deadline" if overdue else "Within its resolution deadline"},
    ]
    points = sum(f["points"] for f in factors)
    level = classify_points(points)
    return level, {
        "level": level,
        "points": points,
        "factors": factors,
        "method": "rule-based",
        "thresholds": {
            "critical": cfg["RISK_CRITICAL_POINTS"], "high": cfg["RISK_HIGH_POINTS"], "medium": cfg["RISK_MEDIUM_POINTS"],
        },
    }


def evaluate(complaint, actor=None):
    """Recalculate the risk level and raise alerts when it reaches High / Critical."""
    from . import alert_service

    previous = complaint.risk_level
    level, breakdown = compute(complaint)
    complaint.risk_level = level
    complaint.risk_breakdown = breakdown
    if complaint.status in OPEN_STATUSES:
        alert_service.handle_risk_change(complaint, previous, level, actor)
    return level


def rank(level):
    return RISK_RANK.get(level or "", 0)
