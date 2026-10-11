from collections import Counter, defaultdict
from datetime import timedelta

from ..extensions import utcnow
from ..models import Complaint, ComplaintSupport, Department, OPEN_STATUSES, RESOLVED_STATUSES, User
from ..utils.validators import CATEGORIES
from .sla_service import sla_status


def _hours(start, end):
    return (end - start).total_seconds() / 3600.0


def _avg(values):
    return round(sum(values) / len(values), 1) if values else None


def public_stats():
    complaints = Complaint.query.all()
    now = utcnow()
    total = len(complaints)
    rejected = sum(1 for c in complaints if c.status == "rejected")
    resolved = [c for c in complaints if c.status in RESOLVED_STATUSES and c.resolved_at]
    open_items = [c for c in complaints if c.status in OPEN_STATUSES]
    sla_states = {c.id: (sla_status(c) or {}).get("state") for c in complaints}
    resolution_hours = [_hours(c.created_at, c.resolved_at) for c in resolved]
    met = sum(1 for c in resolved if sla_states.get(c.id) == "met")

    by_category = []
    for category in CATEGORIES:
        items = [c for c in complaints if c.category == category]
        if items:
            by_category.append({
                "category": category,
                "total": len(items),
                "resolved": sum(1 for c in items if c.status in RESOLVED_STATUSES),
                "open": sum(1 for c in items if c.status in OPEN_STATUSES),
            })
    by_category.sort(key=lambda x: x["total"], reverse=True)

    departments = []
    for department in Department.query.order_by(Department.name).all():
        items = [c for c in complaints if c.department_id == department.id]
        done = [c for c in items if c.status in RESOLVED_STATUSES and c.resolved_at]
        considered = [c for c in items if c.status != "rejected"]
        departments.append({
            "id": department.id,
            "name": department.name,
            "code": department.code,
            "total": len(items),
            "open": sum(1 for c in items if c.status in OPEN_STATUSES),
            "resolved": len(done),
            "overdue": sum(1 for c in items if sla_states.get(c.id) == "overdue"),
            "resolution_rate": round(100 * len(done) / len(considered)) if considered else None,
            "avg_resolution_hours": _avg([_hours(c.created_at, c.resolved_at) for c in done]),
            "sla_compliance": round(100 * sum(1 for c in done if sla_states.get(c.id) == "met") / len(done)) if done else None,
        })

    timeline = []
    for offset in range(29, -1, -1):
        day = (now - timedelta(days=offset)).date()
        timeline.append({
            "date": day.isoformat(),
            "reported": sum(1 for c in complaints if c.created_at.date() == day),
            "resolved": sum(1 for c in resolved if c.resolved_at.date() == day),
        })

    grid = defaultdict(lambda: {"count": 0, "open": 0})
    for c in complaints:
        if c.status == "rejected":
            continue
        cell = grid[(round(c.latitude, 2), round(c.longitude, 2))]
        cell["count"] += 1
        cell["open"] += 1 if c.status in OPEN_STATUSES else 0
    hotspots = sorted(
        [{"latitude": lat, "longitude": lng, **v} for (lat, lng), v in grid.items()],
        key=lambda h: h["count"], reverse=True,
    )[:50]

    considered_total = total - rejected
    return {
        "generated_at": now.replace(microsecond=0).isoformat() + "Z",
        "totals": {
            "total": total,
            "open": len(open_items),
            "resolved": len(resolved),
            "verified": sum(1 for c in complaints if c.status in ("verified", "closed")),
            "rejected": rejected,
            "overdue": sum(1 for s in sla_states.values() if s == "overdue"),
            "escalated": sum(1 for c in open_items if c.escalated),
            "resolution_rate": round(100 * len(resolved) / considered_total) if considered_total else 0,
            "avg_resolution_hours": _avg(resolution_hours),
            "sla_compliance": round(100 * met / len(resolved)) if resolved else None,
            "citizens_engaged": len({c.citizen_id for c in complaints}),
            "supports": ComplaintSupport.query.count(),
            "reported_last_7_days": sum(1 for c in complaints if c.created_at >= now - timedelta(days=7)),
        },
        "by_status": dict(Counter(c.status for c in complaints)),
        "by_severity": dict(Counter(c.severity for c in complaints)),
        "by_category": by_category,
        "departments": departments,
        "timeline": timeline,
        "hotspots": hotspots,
        "recent_resolved": [
            c.summary() for c in sorted(resolved, key=lambda c: c.resolved_at, reverse=True)[:6]
        ],
    }


def citizen_summary(user):
    mine = Complaint.query.filter_by(citizen_id=user.id).order_by(Complaint.created_at.desc()).all()
    counts = Counter(c.status for c in mine)
    return {
        "total": len(mine),
        "open": sum(counts[s] for s in OPEN_STATUSES),
        "awaiting_verification": counts["resolution_submitted"],
        "resolved": counts["resolution_submitted"] + counts["verified"] + counts["closed"],
        "verified": counts["verified"] + counts["closed"],
        "supports_given": ComplaintSupport.query.filter_by(user_id=user.id).count(),
        "by_status": dict(counts),
        "recent": [c.to_dict(viewer=user) for c in mine[:5]],
        "action_needed": [c.to_dict(viewer=user) for c in mine if c.status == "resolution_submitted"][:5],
    }


def employee_summary(user):
    query = Complaint.query
    if user.role == "employee":
        query = query.filter(Complaint.department_id == user.department_id)
    complaints = query.all()
    open_items = [c for c in complaints if c.status in OPEN_STATUSES]
    states = Counter((sla_status(c) or {}).get("state") for c in open_items)
    week_ago = utcnow() - timedelta(days=7)
    return {
        "department": user.department.to_brief() if user.department else None,
        "open": len(open_items),
        "unassigned": sum(1 for c in open_items if not c.assigned_to_id),
        "assigned_to_me": sum(1 for c in open_items if c.assigned_to_id == user.id),
        "overdue": states["overdue"],
        "at_risk": states["at_risk"],
        "escalated": sum(1 for c in open_items if c.escalated),
        "awaiting_verification": sum(1 for c in complaints if c.status == "resolution_submitted"),
        "resolved_this_week": sum(1 for c in complaints if c.resolved_at and c.resolved_at >= week_ago),
        "avg_priority": round(sum(c.priority_score for c in open_items) / len(open_items)) if open_items else 0,
        "critical": sum(1 for c in open_items if c.priority_score >= 75),
    }


def municipal_summary(user):
    """Jurisdiction-scoped, database-derived statistics for the municipal dashboard."""
    from ..models import RiskAlert
    from ..utils.permissions import jurisdiction_query

    complaints = jurisdiction_query(Complaint.query, user, Complaint).all()
    now = utcnow()
    open_items = [c for c in complaints if c.status in OPEN_STATUSES]
    resolved = [c for c in complaints if c.status in RESOLVED_STATUSES and c.resolved_at]
    hours = [_hours(c.created_at, c.resolved_at) for c in resolved]
    ids = [c.id for c in complaints]
    alerts_open = RiskAlert.query.filter(RiskAlert.complaint_id.in_(ids), RiskAlert.status == "open").count() if ids else 0
    week_ago = now - timedelta(days=7)
    worker_query = User.query.filter_by(role="field_worker", is_active=True)
    if user.role != "admin":
        worker_query = worker_query.filter(User.office_id == (user.office_id or -1))
    return {
        "scope": {
            "role": user.role,
            "office": user.office.to_brief() if user.office else None,
            "ward": user.ward.to_brief() if user.ward else None,
            "all_offices": user.role == "admin",
        },
        "total": len(complaints),
        "new": sum(1 for c in complaints if c.status == "submitted"),
        "unassigned": sum(1 for c in open_items if not c.assigned_to_id),
        "assigned_to_staff": sum(1 for c in open_items if c.assigned_to_id),
        "active_field_workers": worker_query.count(),
        "high_risk": sum(1 for c in open_items if c.risk_level == "high"),
        "critical": sum(1 for c in open_items if c.risk_level == "critical"),
        "in_progress": sum(1 for c in complaints if c.status == "in_progress"),
        "resolved": len([c for c in complaints if c.status in RESOLVED_STATUSES]),
        "awaiting_verification": sum(1 for c in complaints if c.status == "resolution_submitted"),
        "overdue": sum(1 for c in open_items if c.sla_due_at and c.sla_due_at < now),
        "avg_resolution_hours": _avg(hours),
        "open": len(open_items),
        "assigned_to_me": sum(1 for c in open_items if c.assigned_to_id == user.id),
        "resolved_this_week": sum(1 for c in resolved if c.resolved_at >= week_ago),
        "unrouted": Complaint.query.filter(Complaint.office_id.is_(None), Complaint.status.in_(OPEN_STATUSES)).count()
        if user.role == "admin" else None,
        "alerts_unacknowledged": alerts_open,
    }
