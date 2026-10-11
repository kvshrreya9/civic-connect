from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import Department
from ..services import department_routing_service
from ..utils.permissions import roles_required
from ..utils.validators import ApiError, CATEGORIES, clean_text, parse_int

bp = Blueprint("departments", __name__, url_prefix="/api/departments")


@bp.get("")
def list_departments():
    departments = Department.query.order_by(Department.name).all()
    return jsonify({"departments": [d.to_dict() for d in departments]})


@bp.get("/routing-rules")
def routing_rules():
    return jsonify({"rules": department_routing_service.routing_rules()})


@bp.get("/<int:department_id>")
def get_department(department_id):
    department = db.session.get(Department, department_id)
    if not department:
        raise ApiError("Department not found", 404)
    return jsonify({"department": department.to_dict()})


@bp.put("/<int:department_id>")
@roles_required("admin")
def update_department(department_id):
    department = db.session.get(Department, department_id)
    if not department:
        raise ApiError("Department not found", 404)
    data = request.get_json(silent=True) or {}
    if "categories" in data:
        categories = [c for c in (data.get("categories") or []) if c in CATEGORIES]
        department.categories = categories
    if "sla_hours" in data:
        department.sla_hours = parse_int(data.get("sla_hours"), default=department.sla_hours, minimum=4, maximum=2000)
    if "description" in data:
        department.description = clean_text(data.get("description"), 1000)
    if "contact_email" in data:
        department.contact_email = clean_text(data.get("contact_email"), 255) or None
    if "is_active" in data:
        department.is_active = bool(data.get("is_active"))
    db.session.commit()
    return jsonify({"department": department.to_dict()})
