"""Administrator management of offices, wards (jurisdiction mappings) and staff."""
import re

from ..extensions import db
from ..models import OFFICE_TYPES, Office, User, Ward
from ..models.user import STAFF_ROLES
from ..utils.validators import PHONE_RE, ApiError, clean_text, parse_float, parse_int
from . import audit_service

CODE_RE = re.compile(r"^[A-Za-z0-9_\-]{2,30}$")


def _code(value, field="code"):
    code = clean_text(value, 30).upper()
    if not CODE_RE.match(code):
        raise ApiError("Code must be 2-30 letters, numbers, - or _", 422, {field: "Invalid code"})
    return code


def save_office(admin, data, office=None):
    creating = office is None
    office = office or Office()
    if creating or "name" in data:
        name = clean_text(data.get("name"), 160)
        if len(name) < 3:
            raise ApiError("Office name is required", 422, {"name": "Required"})
        clash = Office.query.filter(Office.name == name, Office.id != (office.id or -1)).first()
        if clash:
            raise ApiError("An office with this name exists", 409, {"name": "Already used"})
        office.name = name
    if creating or "code" in data:
        code = _code(data.get("code"))
        clash = Office.query.filter(Office.code == code, Office.id != (office.id or -1)).first()
        if clash:
            raise ApiError("An office with this code exists", 409, {"code": "Already used"})
        office.code = code
    if creating or "office_type" in data:
        office_type = data.get("office_type") or "municipality"
        if office_type not in OFFICE_TYPES:
            raise ApiError("Office type must be municipality, panchayat or corporation", 422)
        office.office_type = office_type
    if creating or "latitude" in data or "longitude" in data:
        lat = parse_float(data.get("latitude", office.latitude), "latitude", -90, 90)
        lng = parse_float(data.get("longitude", office.longitude), "longitude", -180, 180)
        if lat is None or lng is None:
            raise ApiError("Office coordinates are required for distance sorting", 422, {"location": "Required"})
        office.latitude, office.longitude = lat, lng
    for field, limit in (("address", 500), ("contact_email", 255)):
        if field in data:
            setattr(office, field, clean_text(data.get(field), limit) or None)
    if "contact_phone" in data:
        contact_phone = clean_text(data.get("contact_phone"), 32)
        if contact_phone and not PHONE_RE.match(contact_phone):
            raise ApiError("Enter a valid public office phone number", 422, {"contact_phone": "Invalid phone number"})
        office.contact_phone = contact_phone or None
    if "critical_alert_phone" in data:
        phone = clean_text(data.get("critical_alert_phone"), 32)
        if phone and not PHONE_RE.match(phone):
            raise ApiError("Enter a valid critical-alert phone number", 422, {"critical_alert_phone": "Invalid phone number"})
        office.critical_alert_phone = phone or None
    for field in ("critical_response_minutes", "high_response_minutes"):
        if field in data:
            setattr(office, field, parse_int(data.get(field), default=60, minimum=5, maximum=10080))
    if "is_active" in data:
        office.is_active = bool(data.get("is_active"))
    if creating:
        db.session.add(office)
    db.session.flush()
    audit_service.record("office.created" if creating else "office.updated", "office", office.id, actor=admin,
                         name=office.name, code=office.code)
    db.session.commit()
    return office


def save_ward(admin, data, ward=None):
    with db.session.no_autoflush:
        return _save_ward(admin, data, ward)


def _save_ward(admin, data, ward=None):
    creating = ward is None
    ward = ward or Ward()
    office_id = parse_int(data.get("office_id", ward.office_id))
    office = db.session.get(Office, office_id) if office_id else None
    if not office:
        raise ApiError("Choose the responsible office", 422, {"office_id": "Required"})
    ward.office_id = office.id
    if creating or "name" in data:
        name = clean_text(data.get("name"), 160)
        if len(name) < 2:
            raise ApiError("Ward name is required", 422, {"name": "Required"})
        ward.name = name
    if creating or "code" in data:
        code = _code(data.get("code"))
        clash = Ward.query.filter(Ward.office_id == office.id, Ward.code == code, Ward.id != (ward.id or -1)).first()
        if clash:
            raise ApiError("This office already has a ward with that code", 409, {"code": "Already used"})
        ward.code = code
    boundary = data.get("boundary_type", ward.boundary_type or "circle")
    if boundary not in ("circle", "polygon"):
        raise ApiError("Boundary type must be circle or polygon", 422)
    ward.boundary_type = boundary
    if boundary == "circle":
        lat = parse_float(data.get("center_lat", ward.center_lat), "center_lat", -90, 90)
        lng = parse_float(data.get("center_lng", ward.center_lng), "center_lng", -180, 180)
        radius = parse_float(data.get("radius_m", ward.radius_m), "radius_m", 10, 100000)
        if lat is None or lng is None or radius is None:
            raise ApiError("Circle wards need a centre and radius", 422, {"boundary": "Required"})
        ward.center_lat, ward.center_lng, ward.radius_m, ward.polygon = lat, lng, radius, None
    else:
        polygon = data.get("polygon", ward.polygon)
        try:
            points = [[float(p[0]), float(p[1])] for p in polygon or []]
        except (TypeError, ValueError, IndexError):
            raise ApiError("Polygon must be a list of [lat, lng] pairs", 422)
        if len(points) < 3 or any(not (-90 <= a <= 90 and -180 <= b <= 180) for a, b in points):
            raise ApiError("Polygon needs at least 3 valid [lat, lng] points", 422)
        ward.polygon = points
        ward.center_lat = sum(p[0] for p in points) / len(points)
        ward.center_lng = sum(p[1] for p in points) / len(points)
        ward.radius_m = None
    if "match_priority" in data:
        ward.match_priority = parse_int(data.get("match_priority"), default=0, minimum=-100, maximum=100)
    if "is_active" in data:
        ward.is_active = bool(data.get("is_active"))
    if creating:
        db.session.add(ward)
    db.session.flush()
    audit_service.record("ward.created" if creating else "ward.updated", "ward", ward.id, actor=admin,
                         office_id=office.id, boundary_type=ward.boundary_type)
    db.session.commit()
    return ward


def list_staff(args):
    query = User.query.filter(User.role.in_(STAFF_ROLES))
    if args.get("office_id"):
        query = query.filter(User.office_id == parse_int(args["office_id"], default=-1))
    if args.get("role"):
        query = query.filter(User.role == args["role"])
    return [u.to_dict() for u in query.order_by(User.role, User.name).all()]
