from flask import Blueprint, g, jsonify, request
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import ResolutionProof
from ..services import complaint_service, verification_service
from ..utils.idempotency import get_idempotency_key
from ..utils.permissions import login_required, roles_required, staff_required
from ..utils.validators import ApiError

bp = Blueprint("verification", __name__, url_prefix="/api/verification")


@bp.get("/<int:complaint_id>")
@login_required
def details(complaint_id):
    complaint = complaint_service.get_complaint_or_404(complaint_id)
    return jsonify(verification_service.verification_details(complaint, g.current_user))


@bp.post("/<int:complaint_id>/proof")
@staff_required
def submit_proof(complaint_id):
    complaint = complaint_service.get_complaint_or_404(complaint_id)
    key = get_idempotency_key(request)
    try:
        proof, created = verification_service.submit_proof(
            complaint, g.current_user, request.form.to_dict(), request.files.getlist("images"), key
        )
    except IntegrityError:
        db.session.rollback()
        proof = ResolutionProof.query.filter_by(client_request_id=key).first() if key else None
        if not proof:
            raise ApiError("Could not save resolution evidence, please retry", 409)
        created = False
    return jsonify({
        "proof": proof.to_dict(),
        "complaint": complaint.to_dict(viewer=g.current_user, detail=True),
        "idempotent_replay": not created,
    }), (201 if created else 200)


@bp.post("/<int:complaint_id>/feedback")
@roles_required("citizen")
def submit_feedback(complaint_id):
    complaint = complaint_service.get_complaint_or_404(complaint_id)
    feedback = verification_service.submit_feedback(complaint, g.current_user, request.get_json(silent=True) or {})
    return jsonify({"feedback": feedback.to_dict(),
                    "complaint": complaint.to_dict(viewer=g.current_user, detail=True)}), 201
