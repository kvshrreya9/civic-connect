from flask import Blueprint, jsonify, request

from ..services import complaint_service, priority_service
from ..utils.permissions import login_required, roles_required

bp = Blueprint("priority", __name__, url_prefix="/api/priority")


@bp.get("/<int:complaint_id>")
@login_required
def get_priority(complaint_id):
    complaint = complaint_service.get_complaint_or_404(complaint_id)
    return jsonify({"score": complaint.priority_score, "breakdown": complaint.priority_breakdown})


@bp.post("/preview")
def preview():
    score, breakdown = priority_service.preview(request.get_json(silent=True) or {})
    return jsonify({"score": score, "breakdown": breakdown})


@bp.post("/recalculate")
@roles_required("employee", "admin")
def recalculate():
    return jsonify({"updated": priority_service.recalculate_open()})
