from flask import Blueprint, g, jsonify, request
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..services import complaint_service, duplicate_service
from ..utils.idempotency import find_existing, get_idempotency_key
from ..utils.permissions import can_manage_complaint, can_work_on_complaint, login_required, roles_required
from ..utils.validators import ApiError

bp = Blueprint("complaints", __name__, url_prefix="/api/complaints")


@bp.post("")
@roles_required("citizen")
def create_complaint():
    key = get_idempotency_key(request)
    form = request.form.to_dict() if request.form else (request.get_json(silent=True) or {})
    files = request.files.getlist("images")
    try:
        complaint, created, candidates = complaint_service.create_complaint(g.current_user, form, files, key)
    except IntegrityError:
        db.session.rollback()
        existing = find_existing(key)
        if not existing or existing.citizen_id != g.current_user.id:
            raise ApiError("Could not save complaint, please retry", 409)
        complaint, created, candidates = existing, False, []
    return jsonify({
        "complaint": complaint.to_dict(viewer=g.current_user, detail=True),
        "duplicates": duplicate_service.serialize(candidates),
        "idempotent_replay": not created,
    }), (201 if created else 200)


@bp.get("")
@login_required
def list_complaints():
    return jsonify(complaint_service.list_complaints(g.current_user, request.args))


@bp.get("/map")
def map_points():
    return jsonify({"points": complaint_service.map_points(request.args)})


@bp.get("/<int:complaint_id>")
@login_required
def get_complaint(complaint_id):
    complaint = complaint_service.get_for_viewer(complaint_id, g.current_user)
    data = complaint.to_dict(viewer=g.current_user, detail=True)
    data["can_manage"] = can_manage_complaint(g.current_user, complaint)
    data["can_work"] = can_work_on_complaint(g.current_user, complaint)
    return jsonify({"complaint": data})


@bp.get("/<int:complaint_id>/history")
@login_required
def history(complaint_id):
    complaint = complaint_service.get_for_viewer(complaint_id, g.current_user)
    data = complaint.to_dict(viewer=g.current_user, detail=True)
    return jsonify({"history": data.get("history", [])})


@bp.post("/<int:complaint_id>/support")
@roles_required("citizen")
def support(complaint_id):
    complaint = complaint_service.get_complaint_or_404(complaint_id)
    supported = complaint_service.toggle_support(complaint, g.current_user)
    return jsonify({"supported": supported, "support_count": complaint.support_count,
                    "priority_score": complaint.priority_score})
