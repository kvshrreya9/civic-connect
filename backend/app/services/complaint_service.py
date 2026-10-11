from flask import current_app
from sqlalchemy import or_

from ..extensions import db, utcnow
from ..models import (
    Complaint, ComplaintStatus, ComplaintSupport, Department, OPEN_STATUSES, Office, User, Ward,
)
from ..utils.permissions import can_manage_complaint, can_view_complaint, can_work_on_complaint
from ..utils.security import generate_reference
from ..utils.validators import (
    ApiError, CATEGORIES, SEVERITIES, clean_text, pagination_args, parse_date, parse_int, validate_complaint_payload,
)
from . import (
    alert_service, audit_service, department_routing_service, duplicate_service, geocoding_service,
    image_storage_service, jurisdiction_service, location_service, notification_service, priority_service,
    risk_service, sla_service,
)

STATUS_LABELS = {
    "submitted": "Submitted",
    "reviewed": "Reviewed",
    "assigned": "Assigned to a field worker",
    "in_progress": "In progress",
    "resolution_submitted": "Resolution submitted - awaiting your verification",
    "verified": "Verified by citizen",
    "closed": "Closed",
    "reopened": "Reopened",
    "rejected": "Rejected",
}

# "assigned" is set by assigning a worker, "resolution_submitted" only by uploading evidence,
# "verified" / "reopened" only by the reporting citizen.
OFFICER_TRANSITIONS = {
    "submitted": {"reviewed", "rejected"},
    "reviewed": {"in_progress", "rejected"},
    "assigned": {"in_progress", "reviewed", "rejected"},
    "in_progress": {"assigned", "rejected"},
    "reopened": {"reviewed", "in_progress", "rejected"},
    "resolution_submitted": {"in_progress"},
    "verified": {"closed"},
    "rejected": {"reviewed"},
    "closed": set(),
}
FIELD_WORKER_TRANSITIONS = {"assigned": {"in_progress"}, "reopened": {"in_progress"}}
# Backwards-compatible name used by older imports.
ALLOWED_TRANSITIONS = OFFICER_TRANSITIONS


def _unique_reference():
    for _ in range(10):
        reference = generate_reference()
        if not Complaint.query.filter_by(reference=reference).first():
            return reference
    raise ApiError("Could not allocate a complaint reference, please retry", 503)


def add_history(complaint, from_status, to_status, note=None, actor=None, internal=False):
    entry = ComplaintStatus(
        complaint=complaint, from_status=from_status, to_status=to_status, note=note,
        is_internal=internal, changed_by_id=actor.id if actor else None,
    )
    db.session.add(entry)
    return entry


def refresh_scores(complaint, actor=None):
    """Related-report counts, priority score and risk level (risk may raise alerts)."""
    location_service.refresh_related_counts(complaint)
    priority_service.update_priority(complaint)
    return risk_service.evaluate(complaint, actor)


def create_complaint(user, form, files, idempotency_key=None):
    """Returns (complaint, created, duplicate_candidates)."""
    if idempotency_key:
        existing = Complaint.query.filter_by(client_request_id=idempotency_key).first()
        if existing:
            if existing.citizen_id != user.id:
                raise ApiError("This request id was already used", 409)
            return existing, False, []

    data = validate_complaint_payload(form)
    processed_images = image_storage_service.process_many(files or [])

    address = data["address"] or geocoding_service.reverse_geocode(data["latitude"], data["longitude"])["address"]
    department = department_routing_service.route(data["category"])
    now = utcnow()
    complaint = Complaint(
        reference=_unique_reference(),
        title=data["title"], description=data["description"], category=data["category"],
        severity=data["severity"], safety_risk=data["safety_risk"], affected_count=data["affected_count"],
        latitude=data["latitude"], longitude=data["longitude"], address=address, status="submitted",
        citizen_id=user.id, department=department, client_request_id=idempotency_key,
        created_at=now, updated_at=now, support_count=0, escalated=False, related_count=0, report_count=1,
        sla_due_at=sla_service.compute_due(data["category"], data["severity"], now, department),
    )
    db.session.add(complaint)
    db.session.flush()

    add_history(complaint, None, "submitted", "Complaint submitted by citizen.", user)
    audit_service.record("complaint.submitted", "complaint", complaint.id, actor=user, complaint=complaint)
    office = jurisdiction_service.apply_routing(complaint)
    for processed in processed_images:
        image_storage_service.save_processed(processed, complaint, "report", user)
    db.session.flush()

    candidates = duplicate_service.find_candidates(
        complaint.latitude, complaint.longitude, complaint.category,
        f"{complaint.title} {complaint.description}", [p.phash for p in processed_images], exclude_id=complaint.id,
    )
    duplicate_service.record_candidates(complaint, candidates)

    notification_service.notify(
        user.id, "Complaint submitted",
        f"{complaint.reference} was received and routed to "
        f"{office.name if office else 'the city administration for manual routing'}.",
        "submitted", complaint.id, dedupe_key=f"submitted:{complaint.id}",
    )
    notification_service.notify_responsible(
        complaint, "New complaint for your office",
        f"{complaint.reference}: {complaint.title}", "new_complaint",
        dedupe_key=f"office-new:{complaint.id}:{complaint.office_id or 'admin'}",
    )

    neighbours = location_service.refresh_related_counts(complaint)
    priority_service.update_priority(complaint)
    risk_service.evaluate(complaint, user)
    for other in neighbours:
        refresh_scores(other)
    for other, _ in location_service.nearby_complaints(
        complaint.latitude, complaint.longitude, current_app.config["PRIORITY_NEARBY_RADIUS_M"],
        category=complaint.category, exclude_id=complaint.id, statuses=OPEN_STATUSES,
    ):
        priority_service.update_priority(other)
    db.session.commit()
    return complaint, True, candidates


def get_complaint_or_404(complaint_id):
    complaint = db.session.get(Complaint, complaint_id)
    if not complaint:
        raise ApiError("Complaint not found", 404)
    return complaint


def get_for_viewer(complaint_id, user):
    """Citizens may open any complaint's public summary (to support it); evidence stays private.
    Staff may only open complaints in their jurisdiction / assignments."""
    complaint = get_complaint_or_404(complaint_id)
    if user.is_staff and not can_view_complaint(user, complaint):
        raise ApiError("Complaint not found", 404)
    return complaint


def _apply_filters(query, args):
    status = args.get("status")
    if status:
        query = query.filter(Complaint.status.in_([s for s in status.split(",") if s]))
    category = args.get("category")
    if category in CATEGORIES:
        query = query.filter(Complaint.category == category)
    severity = args.get("severity")
    if severity in SEVERITIES:
        query = query.filter(Complaint.severity == severity)
    search = clean_text(args.get("q"), 100)
    if search:
        like = f"%{search}%"
        query = query.filter(or_(Complaint.title.ilike(like), Complaint.reference.ilike(like), Complaint.address.ilike(like)))
    date_from, date_to = parse_date(args.get("date_from")), parse_date(args.get("date_to"), end=True)
    if date_from:
        query = query.filter(Complaint.created_at >= date_from)
    if date_to:
        query = query.filter(Complaint.created_at <= date_to)
    return query


def list_complaints(user, args):
    """Citizens: their own complaints. Staff: use the municipal query service instead."""
    from . import municipal_query_service

    if user.is_staff:
        return municipal_query_service.query_complaints(user, args)
    page, per_page = pagination_args(args)
    query = _apply_filters(Complaint.query.filter(Complaint.citizen_id == user.id), args)
    pagination = query.order_by(Complaint.created_at.desc(), Complaint.id.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return {
        "items": [c.to_dict(viewer=user) for c in pagination.items],
        "total": pagination.total,
        "page": page,
        "pages": max(1, pagination.pages),
    }


def map_points(args):
    query = _apply_filters(Complaint.query.filter(Complaint.status != "rejected"), args)
    limit = parse_int(args.get("limit"), default=1000, minimum=1, maximum=2000)
    complaints = query.order_by(Complaint.created_at.desc()).limit(limit).all()
    return [
        {
            "id": c.id, "reference": c.reference, "title": c.title, "category": c.category,
            "severity": c.severity, "status": c.status, "priority_score": c.priority_score,
            "risk_level": c.risk_level, "latitude": c.latitude, "longitude": c.longitude,
            "support_count": c.support_count, "created_at": c.summary()["created_at"],
        }
        for c in complaints
    ]


def toggle_support(complaint, user):
    if complaint.citizen_id == user.id:
        raise ApiError("You reported this issue - it already counts your voice", 400)
    if complaint.status in ("verified", "closed", "rejected"):
        raise ApiError("This complaint is closed", 400)
    existing = ComplaintSupport.query.filter_by(complaint_id=complaint.id, user_id=user.id).first()
    if existing:
        db.session.delete(existing)
        complaint.support_count = max(0, complaint.support_count - 1)
        supported = False
    else:
        db.session.add(ComplaintSupport(complaint_id=complaint.id, user_id=user.id))
        complaint.support_count += 1
        supported = True
        if complaint.support_count in (5, 10, 25, 50, 100):
            notification_service.notify(
                complaint.citizen_id, "Your report is gaining support",
                f"{complaint.support_count} citizens now support {complaint.reference}.", "support", complaint.id,
                dedupe_key=f"support-milestone:{complaint.id}:{complaint.support_count}",
            )
    priority_service.update_priority(complaint)
    db.session.commit()
    return supported


def _require_manager(complaint, actor):
    if not can_manage_complaint(actor, complaint):
        raise ApiError("This complaint is outside your jurisdiction", 403)


def change_status(complaint, actor, new_status, note=None, internal=False):
    note = clean_text(note, 2000)
    if actor.role == "field_worker":
        if not can_work_on_complaint(actor, complaint):
            raise ApiError("This complaint is not assigned to you", 403)
        allowed = FIELD_WORKER_TRANSITIONS.get(complaint.status, set())
    else:
        _require_manager(complaint, actor)
        allowed = set(OFFICER_TRANSITIONS.get(complaint.status, set()))
        if complaint.assigned_to_id and complaint.status in ("in_progress", "reopened"):
            allowed.add("assigned")
    if new_status not in allowed:
        raise ApiError(f"Cannot move from '{complaint.status}' to '{new_status}'", 400)
    if new_status == "rejected" and len(note) < 10:
        raise ApiError("Please explain why the complaint is rejected (10+ characters)", 422, {"note": "Reason required"})

    previous = complaint.status
    complaint.status = new_status
    now = utcnow()
    if new_status in OPEN_STATUSES:
        complaint.resolved_at = None
    if new_status == "reviewed" and not complaint.reviewed_at:
        complaint.reviewed_at = now
    if new_status == "closed":
        complaint.closed_at = now
    entry = add_history(complaint, previous, new_status, note or None, actor, internal)
    db.session.flush()
    audit_service.record("complaint.status_changed", "complaint", complaint.id, actor=actor, complaint=complaint,
                         from_status=previous, to_status=new_status, note=note or None, internal=internal)
    if not internal:
        title = "Complaint closed" if new_status == "closed" else f"Status update: {STATUS_LABELS.get(new_status, new_status)}"
        notification_service.notify(
            complaint.citizen_id, title,
            f"{complaint.reference}: {note}" if note else f"{complaint.reference} is now {STATUS_LABELS.get(new_status)}.",
            "closed" if new_status == "closed" else "status", complaint.id, dedupe_key=f"status:{entry.id}",
        )
    priority_service.update_priority(complaint)
    risk_service.evaluate(complaint, actor)
    db.session.commit()
    return complaint


def assign_worker(complaint, actor, worker_id, note=None, deadline=None):
    _require_manager(complaint, actor)
    if complaint.status in ("verified", "closed", "rejected", "resolution_submitted"):
        raise ApiError("This complaint cannot be assigned in its current status", 400)
    worker = db.session.get(User, parse_int(worker_id)) if worker_id else None
    if not worker or not worker.is_active or worker.role not in ("field_worker", "employee", "officer"):
        raise ApiError("Choose an active field worker", 422)
    if complaint.office_id:
        if worker.office_id != complaint.office_id:
            raise ApiError("The worker must belong to the complaint's office", 422)
    elif worker.department_id != complaint.department_id and actor.role != "admin":
        raise ApiError("The worker must belong to the complaint's department", 422)
    note = clean_text(note, 1000) or None
    if deadline:
        due = parse_date(deadline, end=len(str(deadline)) == 10)
        if due <= utcnow():
            raise ApiError("Deadline must be in the future", 422)
        complaint.sla_due_at = due
        if complaint.escalated and (complaint.escalation_reason or "").startswith("SLA"):
            complaint.escalated = False
            complaint.escalation_reason = None

    previous_worker = complaint.assigned_to_id
    complaint.assigned_to_id = worker.id
    previous = complaint.status
    if complaint.status in ("submitted", "reviewed", "reopened"):
        complaint.status = "assigned"
    entry = add_history(
        complaint, previous, complaint.status,
        f"{'Reassigned' if previous_worker else 'Assigned'} to {worker.name}. {note or ''}".strip(), actor,
    )
    db.session.flush()
    department_routing_service.record_assignment(
        complaint, complaint.department, worker, actor, "manual", note, office=complaint.office
    )
    audit_service.record("complaint.assigned", "complaint", complaint.id, actor=actor, complaint=complaint,
                         worker_id=worker.id, previous_worker_id=previous_worker, note=note,
                         deadline=complaint.sla_due_at.isoformat() if deadline else None)
    notification_service.notify(
        complaint.citizen_id, "Your complaint has been assigned",
        f"{complaint.reference} is now assigned to a field worker.", "assigned", complaint.id,
        dedupe_key=f"assigned:{entry.id}",
    )
    if worker.id != actor.id:
        notification_service.notify(
            worker.id, "New work assigned to you", f"{complaint.reference}: {complaint.title}", "assignment",
            complaint.id, dedupe_key=f"assignment:{entry.id}",
        )
    db.session.commit()
    return complaint


def transfer_office(complaint, actor, office_id, ward_id=None, note=None):
    """Authorised reassignment of the responsible office, with audit trail and notifications."""
    if actor.role != "admin":
        _require_manager(complaint, actor)
    office = db.session.get(Office, parse_int(office_id)) if office_id else None
    if not office or not office.is_active:
        raise ApiError("Office not found", 404)
    ward = None
    if ward_id:
        ward = db.session.get(Ward, parse_int(ward_id))
        if not ward or ward.office_id != office.id:
            raise ApiError("Ward does not belong to that office", 422)
    if office.id == complaint.office_id and (ward is None or ward.id == complaint.ward_id):
        raise ApiError("The complaint already belongs to this office", 400)
    note = clean_text(note, 1000) or None
    previous_office_id = complaint.office_id
    complaint.office = office
    complaint.ward = ward
    complaint.routing_status = "manual"
    complaint.assigned_to_id = None
    if complaint.status == "assigned":
        complaint.status = "reviewed"
    add_history(complaint, complaint.status, complaint.status,
                f"Transferred to {office.name}{f' ({ward.name})' if ward else ''}. {note or ''}".strip(), actor, True)
    department_routing_service.record_assignment(
        complaint, complaint.department, None, actor, "office_transfer" if previous_office_id else "manual_routing",
        note, office=office,
    )
    audit_service.record("complaint.office_transferred", "complaint", complaint.id, actor=actor, complaint=complaint,
                         from_office_id=previous_office_id, to_office_id=office.id,
                         ward_id=ward.id if ward else None, note=note)
    notification_service.notify_office(
        office.id, "Complaint reassigned to your office", f"{complaint.reference}: {complaint.title}",
        "reassigned", complaint.id, dedupe_key=f"office-transfer:{complaint.id}:{office.id}:{utcnow().isoformat()}",
    )
    alert_service.on_office_changed(complaint, previous_office_id, actor)
    db.session.commit()
    return complaint


def assign(complaint, actor, assigned_to_id=None, department_id=None, note=None):
    """Legacy endpoint support: department transfer and/or worker assignment."""
    _require_manager(complaint, actor)
    if department_id and department_id != complaint.department_id:
        department = db.session.get(Department, department_id)
        if not department or not department.is_active:
            raise ApiError("Department not found", 404)
        complaint.department = department
        complaint.assigned_to_id = None
        add_history(complaint, complaint.status, complaint.status,
                    f"Transferred to {department.name}. {clean_text(note, 500)}".strip(), actor, True)
        department_routing_service.record_assignment(complaint, department, None, actor, "transfer", note)
        audit_service.record("complaint.department_transferred", "complaint", complaint.id, actor=actor,
                             complaint=complaint, department_id=department.id)
        notification_service.notify_department(department.id, "Complaint transferred to your department",
                                               f"{complaint.reference}: {complaint.title}", "reassigned", complaint.id)
        db.session.commit()
    if assigned_to_id:
        return assign_worker(complaint, actor, assigned_to_id, note)
    if not department_id:
        raise ApiError("Choose a staff member or a department", 422)
    return complaint


def add_note(complaint, actor, note):
    if not can_work_on_complaint(actor, complaint):
        raise ApiError("This complaint is outside your jurisdiction", 403)
    note = clean_text(note, 2000)
    if len(note) < 2:
        raise ApiError("Note cannot be empty", 422)
    add_history(complaint, complaint.status, complaint.status, note, actor, internal=True)
    audit_service.record("complaint.note_added", "complaint", complaint.id, actor=actor, complaint=complaint)
    db.session.commit()
    return complaint


def field_workers(user, office_id=None):
    if user.role == "admin" and office_id:
        target = parse_int(office_id)
    else:
        target = user.office_id
    query = User.query.filter(User.role == "field_worker", User.is_active.is_(True))
    if target:
        query = query.filter(User.office_id == target)
    elif user.role != "admin":
        query = query.filter(User.department_id == user.department_id)
    return [
        {**u.to_brief(), "office_id": u.office_id, "ward": u.ward.to_brief() if u.ward else None,
         "open_assignments": Complaint.query.filter(Complaint.assigned_to_id == u.id,
                                                    Complaint.status.in_(OPEN_STATUSES)).count()}
        for u in query.order_by(User.name).all()
    ]


def department_staff(user, department_id=None):
    """Legacy: assignable staff list."""
    return field_workers(user)


def employee_queue(user, args):
    from . import municipal_query_service

    return municipal_query_service.query_complaints(user, args)
