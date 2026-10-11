from flask import Blueprint, g, jsonify, request

from ..extensions import db
from ..models import AuditLog, Office, User, Ward
from ..services import admin_service, auth_service, complaint_service, jurisdiction_service
from ..utils.permissions import admin_required
from ..utils.validators import ApiError, pagination_args, parse_float

bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def _get(model, item_id, label):
    item = db.session.get(model, item_id)
    if not item:
        raise ApiError(f"{label} not found", 404)
    return item


@bp.get("/offices")
@admin_required
def offices():
    return jsonify({"offices": [o.to_dict() for o in Office.query.order_by(Office.name).all()]})


@bp.post("/offices")
@admin_required
def create_office():
    return jsonify({"office": admin_service.save_office(g.current_user, request.get_json(silent=True) or {}).to_dict()}), 201


@bp.put("/offices/<int:office_id>")
@admin_required
def update_office(office_id):
    office = _get(Office, office_id, "Office")
    return jsonify({"office": admin_service.save_office(g.current_user, request.get_json(silent=True) or {}, office).to_dict()})


@bp.get("/wards")
@admin_required
def wards():
    query = Ward.query
    if request.args.get("office_id"):
        query = query.filter(Ward.office_id == int(request.args["office_id"]))
    return jsonify({"wards": [w.to_dict() for w in query.order_by(Ward.office_id, Ward.name).all()]})


@bp.post("/wards")
@admin_required
def create_ward():
    return jsonify({"ward": admin_service.save_ward(g.current_user, request.get_json(silent=True) or {}).to_dict()}), 201


@bp.put("/wards/<int:ward_id>")
@admin_required
def update_ward(ward_id):
    ward = _get(Ward, ward_id, "Ward")
    return jsonify({"ward": admin_service.save_ward(g.current_user, request.get_json(silent=True) or {}, ward).to_dict()})


@bp.get("/routing/test")
@admin_required
def routing_test():
    lat = parse_float(request.args.get("lat"), "lat", -90, 90)
    lng = parse_float(request.args.get("lng"), "lng", -180, 180)
    if lat is None or lng is None:
        raise ApiError("lat and lng are required", 422)
    ward, office = jurisdiction_service.resolve(lat, lng)
    return jsonify({"office": office.to_brief() if office else None, "ward": ward.to_brief() if ward else None})


@bp.post("/routing/reroute-unmapped")
@admin_required
def reroute():
    return jsonify({"routed": jurisdiction_service.reroute_unmapped(g.current_user)})


@bp.get("/staff")
@admin_required
def staff():
    return jsonify({"staff": admin_service.list_staff(request.args)})


@bp.post("/staff")
@admin_required
def create_staff():
    user = auth_service.create_staff(g.current_user, request.get_json(silent=True) or {})
    return jsonify({"user": user.to_dict()}), 201


@bp.put("/staff/<int:user_id>")
@admin_required
def update_staff(user_id):
    user = _get(User, user_id, "Staff member")
    return jsonify({"user": auth_service.update_staff(g.current_user, user, request.get_json(silent=True) or {}).to_dict()})


@bp.post("/complaints/<int:complaint_id>/route")
@admin_required
def route_complaint(complaint_id):
    data = request.get_json(silent=True) or {}
    complaint = complaint_service.get_complaint_or_404(complaint_id)
    complaint_service.transfer_office(complaint, g.current_user, data.get("office_id"), data.get("ward_id"), data.get("note"))
    return jsonify({"complaint": complaint.to_dict(viewer=g.current_user, detail=True)})


@bp.get("/audit")
@admin_required
def audit():
    page, per_page = pagination_args(request.args, default_per_page=50)
    query = AuditLog.query
    if request.args.get("action"):
        query = query.filter(AuditLog.action.ilike(f"{request.args['action']}%"))
    pagination = query.order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).paginate(
        page=page, per_page=per_page, error_out=False)
    return jsonify({"items": [a.to_dict() for a in pagination.items], "total": pagination.total,
                    "page": page, "pages": max(1, pagination.pages)})
