from ..extensions import db
from ..models import Department, DepartmentAssignment
from ..utils.validators import CATEGORIES

FALLBACK_CODE = "GEN"

DEFAULT_DEPARTMENTS = [
    {"code": "RDS", "name": "Roads & Infrastructure", "categories": ["pothole", "road_damage"], "sla_hours": 96,
     "contact_email": "roads@civicconnect.demo", "description": "Road surfaces, potholes, footpaths and bridges."},
    {"code": "SWM", "name": "Solid Waste Management", "categories": ["garbage"], "sla_hours": 24,
     "contact_email": "waste@civicconnect.demo", "description": "Garbage collection, dumping and street cleaning."},
    {"code": "WTR", "name": "Water Supply", "categories": ["water_leakage"], "sla_hours": 24,
     "contact_email": "water@civicconnect.demo", "description": "Pipeline leaks, bursts and supply disruptions."},
    {"code": "DRN", "name": "Stormwater & Drainage", "categories": ["drainage"], "sla_hours": 48,
     "contact_email": "drainage@civicconnect.demo", "description": "Blocked drains, overflow and waterlogging."},
    {"code": "ELC", "name": "Electrical & Street Lighting", "categories": ["streetlight"], "sla_hours": 72,
     "contact_email": "lighting@civicconnect.demo", "description": "Streetlights, exposed wiring and poles."},
    {"code": "PRK", "name": "Parks & Urban Forestry", "categories": ["tree_hazard"], "sla_hours": 48,
     "contact_email": "parks@civicconnect.demo", "description": "Fallen or dangerous trees, parks upkeep."},
    {"code": "GEN", "name": "General Administration", "categories": ["other"], "sla_hours": 96,
     "contact_email": "general@civicconnect.demo", "description": "Issues that need triage by the city office."},
]


def ensure_default_departments():
    """Insert any missing default departments without touching existing data."""
    existing = {d.code for d in Department.query.all()}
    added = 0
    for spec in DEFAULT_DEPARTMENTS:
        if spec["code"] not in existing:
            db.session.add(Department(**spec))
            added += 1
    if added:
        db.session.commit()
    return added


def route(category):
    departments = Department.query.filter_by(is_active=True).order_by(Department.id).all()
    for department in departments:
        if category in (department.categories or []):
            return department
    for department in departments:
        if department.code == FALLBACK_CODE:
            return department
    return departments[0] if departments else None


def routing_rules():
    rules = {}
    for category in CATEGORIES:
        department = route(category)
        rules[category] = department.to_brief() if department else None
    return rules


def record_assignment(complaint, department, assigned_to=None, assigned_by=None, reason="auto_routing", note=None, office=None):
    assignment = DepartmentAssignment(
        complaint=complaint,
        department_id=department.id if department else None,
        office_id=office.id if office else complaint.office_id,
        assigned_to_id=assigned_to.id if assigned_to else None,
        assigned_by_id=assigned_by.id if assigned_by else None,
        reason=reason,
        note=note,
    )
    db.session.add(assignment)
    return assignment
