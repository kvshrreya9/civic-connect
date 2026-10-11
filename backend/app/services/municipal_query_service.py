"""Jurisdiction-scoped complaint listing with validated filters and multi-key sorting.

Filtering, sorting and pagination run in the database. Distance ordering uses an
equirectangular expression (pure arithmetic, so it works on PostgreSQL and SQLite and is
monotonic with true distance at city scale); the distance shown to users is exact Haversine.
"""
import math

from flask import current_app
from sqlalchemy import and_, case, or_
from sqlalchemy.orm import aliased

from ..extensions import utcnow
from ..models import Complaint, OPEN_STATUSES, Office, RISK_LEVELS, STATUSES
from ..utils.permissions import jurisdiction_query
from ..utils.validators import (
    ApiError, CATEGORIES, SEVERITIES, clean_text, pagination_args, parse_date, parse_float, parse_int,
)
from . import location_service

SORT_FIELDS = {
    "risk": "Risk level",
    "priority": "Priority score",
    "reports": "Number of reports (unique citizens)",
    "related": "Related reports nearby",
    "distance_office": "Distance from office",
    "distance_point": "Distance from selected point",
    "created": "Date reported",
    "overdue": "Most overdue",
    "deadline": "Deadline",
    "status": "Status",
}
MAX_SORT_RULES = 4
DEFAULT_SORT = [("risk", "desc"), ("priority", "desc")]
ACTIVE_DEFAULT_STATUSES = OPEN_STATUSES + ("resolution_submitted", "verified")


def parse_sort(value):
    """'risk:desc,reports:desc' -> [('risk','desc'), ('reports','desc')]"""
    if not value:
        return list(DEFAULT_SORT)
    rules = []
    for part in str(value).split(","):
        part = part.strip()
        if not part:
            continue
        field, _, direction = part.partition(":")
        field, direction = field.strip(), (direction.strip() or "desc").lower()
        if field not in SORT_FIELDS:
            raise ApiError(f"Unknown sort field '{field}'", 422)
        if direction not in ("asc", "desc"):
            raise ApiError(f"Sort direction must be asc or desc, not '{direction}'", 422)
        if field not in [r[0] for r in rules]:
            rules.append((field, direction))
    if not rules:
        return list(DEFAULT_SORT)
    if len(rules) > MAX_SORT_RULES:
        raise ApiError(f"At most {MAX_SORT_RULES} sort rules", 422)
    return rules


def _risk_rank_expr():
    return case(
        (Complaint.risk_level == "critical", 4),
        (Complaint.risk_level == "high", 3),
        (Complaint.risk_level == "medium", 2),
        (Complaint.risk_level == "low", 1),
        else_=0,
    )


def _distance_expr(lat_col, lng_col, ref_lat, ref_lng):
    k = math.cos(math.radians(ref_lat))
    return (lat_col - ref_lat) * (lat_col - ref_lat) + (lng_col - ref_lng) * (lng_col - ref_lng) * (k * k)


def _order_clauses(rules, office_alias, ref_point, now, k_point=None):
    clauses = []
    for field, direction in rules:
        desc = direction == "desc"
        if field == "risk":
            expr = _risk_rank_expr()
            clauses.append(expr.desc() if desc else expr.asc())
        elif field == "priority":
            clauses.append(Complaint.priority_score.desc() if desc else Complaint.priority_score.asc())
        elif field == "reports":
            clauses.append(Complaint.report_count.desc() if desc else Complaint.report_count.asc())
        elif field == "related":
            clauses.append(Complaint.related_count.desc() if desc else Complaint.related_count.asc())
        elif field == "created":
            clauses.append(Complaint.created_at.desc() if desc else Complaint.created_at.asc())
        elif field == "deadline":
            clauses.append(case((Complaint.sla_due_at.is_(None), 1), else_=0).asc())
            clauses.append(Complaint.sla_due_at.desc() if desc else Complaint.sla_due_at.asc())
        elif field == "status":
            order = {s: i for i, s in enumerate(STATUSES)}
            expr = case(*[(Complaint.status == s, i) for s, i in order.items()], else_=99)
            clauses.append(expr.desc() if desc else expr.asc())
        elif field == "overdue":
            is_overdue = and_(Complaint.status.in_(OPEN_STATUSES), Complaint.sla_due_at.isnot(None),
                              Complaint.sla_due_at < now)
            # desc = most overdue first (overdue rows, earliest deadline first); asc = the reverse.
            clauses.append(case((is_overdue, 0), else_=1).asc() if desc else case((is_overdue, 0), else_=1).desc())
            clauses.append(Complaint.sla_due_at.asc() if desc else Complaint.sla_due_at.desc())
        elif field == "distance_office":
            missing = or_(office_alias.latitude.is_(None), office_alias.longitude.is_(None))
            k = math.cos(math.radians(k_point[0])) if k_point else 1.0
            expr = ((Complaint.latitude - office_alias.latitude) * (Complaint.latitude - office_alias.latitude)
                    + (Complaint.longitude - office_alias.longitude) * (Complaint.longitude - office_alias.longitude) * (k * k))
            clauses.append(case((missing, 1), else_=0).asc())
            clauses.append(expr.desc() if desc else expr.asc())
        elif field == "distance_point":
            if not ref_point:
                raise ApiError("Choose a reference location (ref_lat / ref_lng) to sort by distance", 422)
            expr = _distance_expr(Complaint.latitude, Complaint.longitude, ref_point[0], ref_point[1])
            clauses.append(expr.desc() if desc else expr.asc())
    clauses.append(Complaint.id.asc())  # stable, predictable tie-break
    return clauses


def query_complaints(user, args):
    now = utcnow()
    rules = parse_sort(args.get("sort"))
    ref_lat = parse_float(args.get("ref_lat"), "ref_lat", -90, 90)
    ref_lng = parse_float(args.get("ref_lng"), "ref_lng", -180, 180)
    ref_point = (ref_lat, ref_lng) if ref_lat is not None and ref_lng is not None else None
    if (ref_lat is None) != (ref_lng is None):
        raise ApiError("Provide both ref_lat and ref_lng", 422)

    office_alias = aliased(Office)
    query = jurisdiction_query(Complaint.query, user, Complaint).outerjoin(
        office_alias, Complaint.office_id == office_alias.id
    )

    # --- filters ---
    status = args.get("status")
    if status and status != "all":
        statuses = [s for s in status.split(",") if s]
        bad = [s for s in statuses if s not in STATUSES]
        if bad:
            raise ApiError(f"Unknown status '{bad[0]}'", 422)
        query = query.filter(Complaint.status.in_(statuses))
    elif not status:
        query = query.filter(Complaint.status.in_(ACTIVE_DEFAULT_STATUSES))
    risk = [r for r in (args.get("risk") or "").split(",") if r]
    if risk:
        if any(r not in RISK_LEVELS for r in risk):
            raise ApiError("Risk must be low, medium, high or critical", 422)
        query = query.filter(Complaint.risk_level.in_(risk))
    if args.get("category"):
        if args["category"] not in CATEGORIES:
            raise ApiError("Unknown category", 422)
        query = query.filter(Complaint.category == args["category"])
    if args.get("severity"):
        if args["severity"] not in SEVERITIES:
            raise ApiError("Unknown severity", 422)
        query = query.filter(Complaint.severity == args["severity"])
    if args.get("ward_id"):
        query = query.filter(Complaint.ward_id == parse_int(args["ward_id"], default=-1))
    if args.get("office_id") and user.role == "admin":
        query = query.filter(Complaint.office_id == parse_int(args["office_id"], default=-1))
    if args.get("unrouted") in ("1", "true") and user.role == "admin":
        query = query.filter(Complaint.office_id.is_(None))
    assigned = args.get("assigned_to") or args.get("assigned")
    if assigned == "me":
        query = query.filter(Complaint.assigned_to_id == user.id)
    elif assigned == "assigned":
        query = query.filter(Complaint.assigned_to_id.is_not(None))
    elif assigned == "unassigned":
        query = query.filter(Complaint.assigned_to_id.is_(None))
    elif assigned:
        query = query.filter(Complaint.assigned_to_id == parse_int(assigned, default=-1))
    if args.get("overdue") in ("1", "true"):
        query = query.filter(Complaint.status.in_(OPEN_STATUSES), Complaint.sla_due_at < now)
    if args.get("escalated") in ("1", "true"):
        query = query.filter(Complaint.escalated.is_(True))
    min_reports = parse_int(args.get("min_reports"))
    if min_reports:
        query = query.filter(Complaint.report_count >= min_reports)
    min_related = parse_int(args.get("min_related"))
    if min_related:
        query = query.filter(Complaint.related_count >= min_related)
    date_from, date_to = parse_date(args.get("date_from")), parse_date(args.get("date_to"), end=True)
    if date_from:
        query = query.filter(Complaint.created_at >= date_from)
    if date_to:
        query = query.filter(Complaint.created_at <= date_to)
    search = clean_text(args.get("q"), 100)
    if search:
        like = f"%{search}%"
        query = query.filter(or_(Complaint.title.ilike(like), Complaint.reference.ilike(like),
                                 Complaint.address.ilike(like), Complaint.description.ilike(like)))

    # Longitude scale factor for office-distance ordering: the officer's office latitude when known.
    k_point = ref_point
    if not k_point and user.office and user.office.latitude is not None:
        k_point = (user.office.latitude, user.office.longitude)
    query = query.order_by(*_order_clauses(rules, office_alias, ref_point, now, k_point))
    page, per_page = pagination_args(args, default_per_page=20)
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    cfg_widespread = current_app.config["WIDESPREAD_REPORT_THRESHOLD"]
    items = []
    for complaint in pagination.items:
        data = complaint.to_dict(viewer=user)
        office = complaint.office
        data["distance_from_office_m"] = (
            round(location_service.haversine_m(complaint.latitude, complaint.longitude, office.latitude, office.longitude), 1)
            if office and office.latitude is not None else None
        )
        data["distance_from_point_m"] = (
            round(location_service.haversine_m(complaint.latitude, complaint.longitude, ref_point[0], ref_point[1]), 1)
            if ref_point else None
        )
        data["widespread"] = (complaint.report_count or 1) >= cfg_widespread
        data["thumbnail"] = data["images"][0]["url"] if data.get("images") else None
        items.append(data)

    return {
        "items": items,
        "total": pagination.total,
        "page": page,
        "per_page": per_page,
        "pages": max(1, pagination.pages),
        "sort": [{"field": f, "direction": d, "label": SORT_FIELDS[f]} for f, d in rules],
        "reference_point": {"latitude": ref_point[0], "longitude": ref_point[1]} if ref_point else None,
    }
