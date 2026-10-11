from flask import Blueprint, g, jsonify, request

from ..extensions import db
from ..models import DuplicateCandidate
from ..services import complaint_service, duplicate_service
from ..utils.permissions import can_manage_complaint, login_required
from ..utils.validators import ApiError, CATEGORIES, clean_text, validate_coordinates

bp = Blueprint("duplicates", __name__, url_prefix="/api/duplicates")


@bp.post("/check")
@login_required
def check():
    data = request.get_json(silent=True) or {}
    lat, lng = validate_coordinates(data.get("latitude"), data.get("longitude"))
    category = data.get("category")
    if category not in CATEGORIES:
        raise ApiError("Choose a valid category", 422)
    candidates = duplicate_service.find_candidates(
        lat, lng, category, clean_text(data.get("description"), 4000), data.get("image_hashes") or []
    )
    return jsonify({"candidates": duplicate_service.serialize(candidates)})


@bp.get("/complaint/<int:complaint_id>")
@login_required
def for_complaint(complaint_id):
    complaint = complaint_service.get_complaint_or_404(complaint_id)
    from ..utils.permissions import can_view_complaint

    if not can_view_complaint(g.current_user, complaint):
        raise ApiError("Not allowed", 403)
    return jsonify({"candidates": [c.to_dict() for c in duplicate_service.candidates_for(complaint)]})


@bp.post("/<int:candidate_id>/resolve")
@login_required
def resolve(candidate_id):
    row = db.session.get(DuplicateCandidate, candidate_id)
    if not row:
        raise ApiError("Duplicate candidate not found", 404)
    if not can_manage_complaint(g.current_user, row.complaint):
        raise ApiError("Not allowed", 403)
    action = (request.get_json(silent=True) or {}).get("action")
    if action not in ("confirm", "reject"):
        raise ApiError("Action must be 'confirm' or 'reject'", 422)
    return jsonify({"candidate": duplicate_service.resolve_candidate(row, action).to_dict()})
