"""Legacy /api/employee endpoints, kept for backwards compatibility.
They delegate to the municipal services and enforce the same jurisdiction rules."""
from flask import Blueprint, g, jsonify, request

from ..services import complaint_service, municipal_query_service
from ..utils.permissions import can_view_complaint, officer_required, staff_required
from ..utils.validators import ApiError, parse_bool, parse_int

bp = Blueprint("employee", __name__, url_prefix="/api/employee")


def _get(complaint_id):
    complaint = complaint_service.get_complaint_or_404(complaint_id)
    if not can_view_complaint(g.current_user, complaint):
        raise ApiError("This complaint is outside your jurisdiction", 403)
    return complaint


@bp.get("/queue")
@staff_required
def queue():
    return jsonify(municipal_query_service.query_complaints(g.current_user, request.args))


@bp.get("/staff")
@officer_required
def staff():
    return jsonify({"staff": complaint_service.field_workers(g.current_user)})


@bp.post("/complaints/<int:complaint_id>/status")
@staff_required
def update_status(complaint_id):
    data = request.get_json(silent=True) or {}
    complaint = _get(complaint_id)
    complaint_service.change_status(complaint, g.current_user, data.get("status"), data.get("note"),
                                    parse_bool(data.get("is_internal")))
    return jsonify({"complaint": complaint.to_dict(viewer=g.current_user, detail=True)})


@bp.post("/complaints/<int:complaint_id>/assign")
@officer_required
def assign(complaint_id):
    data = request.get_json(silent=True) or {}
    complaint = _get(complaint_id)
    complaint_service.assign(complaint, g.current_user, assigned_to_id=parse_int(data.get("assigned_to_id")),
                             department_id=parse_int(data.get("department_id")), note=data.get("note"))
    return jsonify({"complaint": complaint.to_dict(viewer=g.current_user, detail=True)})


@bp.post("/complaints/<int:complaint_id>/notes")
@staff_required
def add_note(complaint_id):
    complaint = _get(complaint_id)
    complaint_service.add_note(complaint, g.current_user, (request.get_json(silent=True) or {}).get("note"))
    return jsonify({"complaint": complaint.to_dict(viewer=g.current_user, detail=True)}), 201


@bp.get("/complaints/<int:complaint_id>/assignments")
@staff_required
def assignments(complaint_id):
    return jsonify({"assignments": [a.to_dict() for a in _get(complaint_id).assignments]})
