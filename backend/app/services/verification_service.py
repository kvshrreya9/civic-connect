"""Resolution evidence (field worker) and citizen verification / dispute."""
from ..extensions import db, utcnow
from ..models import ResolutionFeedback, ResolutionProof
from ..utils.permissions import can_view_complaint, can_work_on_complaint
from ..utils.validators import ApiError, clean_text, parse_date, parse_float, parse_int
from . import audit_service, image_storage_service, notification_service, priority_service, risk_service
from .complaint_service import add_history

PROOF_ALLOWED_FROM = ("reviewed", "assigned", "in_progress", "reopened")
FIELD_WORKER_PROOF_FROM = ("assigned", "in_progress", "reopened")
MAX_EVIDENCE_PHOTOS = 5  # 1 resolution photo + up to 4 additional


def submit_proof(complaint, worker, form, files, idempotency_key=None):
    """Returns (proof, created). A repeated request with the same Idempotency-Key returns the original."""
    if idempotency_key:
        existing = ResolutionProof.query.filter_by(client_request_id=idempotency_key).first()
        if existing:
            if existing.complaint_id != complaint.id or existing.employee_id != worker.id:
                raise ApiError("This request id was already used", 409)
            return existing, False
    if not can_work_on_complaint(worker, complaint):
        raise ApiError("You can only submit evidence for complaints assigned to you", 403)
    allowed = FIELD_WORKER_PROOF_FROM if worker.role == "field_worker" else PROOF_ALLOWED_FROM
    if complaint.status not in allowed:
        raise ApiError("Resolution evidence can only be submitted for open, assigned complaints", 400)

    form = form or {}
    description = clean_text(form.get("description") or form.get("notes"), 2000)
    if len(description) < 10:
        raise ApiError("Describe the work done (10+ characters)", 422, {"description": "Required"})
    processed = image_storage_service.process_many(files or [], max_images=MAX_EVIDENCE_PHOTOS)
    if not processed:
        raise ApiError("A resolution photo is required", 422, {"images": "Upload a photo of the completed work"})
    completed_at = parse_date(form.get("completed_at")) if form.get("completed_at") else utcnow()
    if completed_at > utcnow():
        raise ApiError("Completion time cannot be in the future", 422)
    if completed_at < complaint.created_at:
        raise ApiError("Completion time cannot be before the complaint was reported", 422)
    lat = parse_float(form.get("completion_lat"), "completion_lat", -90, 90)
    lng = parse_float(form.get("completion_lng"), "completion_lng", -180, 180)
    if (lat is None) != (lng is None):
        raise ApiError("Provide both completion latitude and longitude", 422)

    proof = ResolutionProof(
        complaint=complaint, employee_id=worker.id, notes=description, completed_at=completed_at,
        completion_lat=lat, completion_lng=lng, client_request_id=idempotency_key,
    )
    db.session.add(proof)
    db.session.flush()
    for item in processed:
        image_storage_service.save_processed(item, complaint, "resolution", worker, proof)

    previous = complaint.status
    complaint.status = "resolution_submitted"
    complaint.resolved_at = utcnow()
    if not complaint.assigned_to_id:
        complaint.assigned_to_id = worker.id
    add_history(complaint, previous, "resolution_submitted", description, worker)
    audit_service.record("resolution.submitted", "resolution_proof", proof.id, actor=worker, complaint=complaint,
                         photos=len(processed), completed_at=completed_at.isoformat(),
                         completion_lat=lat, completion_lng=lng)
    notification_service.notify(
        complaint.citizen_id, "Resolution photo uploaded - please verify",
        f"{complaint.reference} has a completion photo. Confirm it is fixed or dispute it.",
        "resolution_uploaded", complaint.id, dedupe_key=f"resolution:{proof.id}",
    )
    notification_service.notify_responsible(
        complaint, "Resolution submitted", f"{complaint.reference} evidence uploaded by {worker.name}.",
        "resolution_uploaded", dedupe_key=f"resolution-office:{proof.id}", exclude_user_id=worker.id,
    )
    priority_service.update_priority(complaint)
    risk_service.evaluate(complaint, worker)
    db.session.commit()
    return proof, True


def submit_feedback(complaint, citizen, data):
    if complaint.citizen_id != citizen.id:
        raise ApiError("Only the reporting citizen can verify this resolution", 403)
    if complaint.status != "resolution_submitted":
        raise ApiError("This complaint is not awaiting verification", 400)
    verdict = (data.get("verdict") or "").lower()
    if verdict not in ("confirmed", "disputed"):
        raise ApiError("Verdict must be 'confirmed' or 'disputed'", 422)
    rating = parse_int(data.get("rating"))
    if rating is not None and not 1 <= rating <= 5:
        raise ApiError("Rating must be between 1 and 5", 422)
    comment = clean_text(data.get("comment"), 2000)
    if verdict == "disputed" and len(comment) < 5:
        raise ApiError("Tell us what is still wrong", 422, {"comment": "Required when disputing"})

    feedback = ResolutionFeedback(complaint=complaint, citizen_id=citizen.id, verdict=verdict, rating=rating,
                                  comment=comment or None)
    db.session.add(feedback)
    db.session.flush()
    if verdict == "confirmed":
        complaint.status = "verified"
        complaint.verified_at = utcnow()
        add_history(complaint, "resolution_submitted", "verified", comment or "Citizen confirmed the resolution.", citizen)
        notification_service.notify_responsible(
            complaint, "Resolution verified by citizen", f"{complaint.reference} was confirmed fixed. It can now be closed.",
            "verified", dedupe_key=f"feedback:{feedback.id}",
        )
    else:
        complaint.status = "reopened"
        complaint.resolved_at = None
        complaint.escalated = True
        complaint.escalation_reason = "Citizen disputed the resolution"
        add_history(complaint, "resolution_submitted", "reopened", f"Citizen disputed: {comment}", citizen)
        notification_service.notify_responsible(
            complaint, "Resolution disputed by citizen", f"{complaint.reference} was reopened: {comment}",
            "disputed", dedupe_key=f"feedback:{feedback.id}",
        )
        if complaint.assigned_to_id:
            notification_service.notify(
                complaint.assigned_to_id, "Resolution disputed", f"{complaint.reference} needs another visit: {comment}",
                "disputed", complaint.id, dedupe_key=f"feedback-worker:{feedback.id}",
            )
        notification_service.notify(
            citizen.id, "Complaint reopened", f"{complaint.reference} was returned to the responsible office for review.",
            "reopened", complaint.id, dedupe_key=f"feedback-citizen:{feedback.id}",
        )
    audit_service.record("resolution.feedback", "resolution_feedback", feedback.id, actor=citizen,
                         complaint=complaint, verdict=verdict, rating=rating)
    priority_service.update_priority(complaint)
    risk_service.evaluate(complaint, citizen)
    db.session.commit()
    return feedback


def verification_details(complaint, viewer):
    if not can_view_complaint(viewer, complaint):
        raise ApiError("Resolution evidence is only visible to the reporting citizen and responsible staff", 403)
    allowed = FIELD_WORKER_PROOF_FROM if viewer.role == "field_worker" else PROOF_ALLOWED_FROM
    return {
        "complaint_id": complaint.id,
        "reference": complaint.reference,
        "status": complaint.status,
        "verification_status": complaint.verification_status(),
        "before": [img.to_dict() for img in complaint.report_images()],
        "after": [img.to_dict() for img in complaint.resolution_images()],
        "proofs": [p.to_dict() for p in complaint.proofs],
        "feedback": [f.to_dict() for f in complaint.feedback],
        "can_submit_feedback": viewer.id == complaint.citizen_id and complaint.status == "resolution_submitted",
        "can_submit_proof": viewer.is_staff and can_work_on_complaint(viewer, complaint) and complaint.status in allowed,
    }
