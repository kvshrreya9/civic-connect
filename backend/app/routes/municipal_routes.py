from flask import Blueprint, g, jsonify, request

from ..models import Ward
from ..services import (
    alert_service, audit_service, complaint_service, dashboard_service, municipal_query_service,
)
from ..utils.permissions import can_view_complaint, officer_required, staff_required
from ..utils.validators import ApiError, parse_bool

bp = Blueprint("municipal", __name__, url_prefix="/api/municipal")


def _detail(complaint):
    from ..utils.permissions import can_manage_complaint, can_work_on_complaint

    data = complaint.to_dict(viewer=g.current_user, detail=True)
    data["can_manage"] = can_manage_complaint(g.current_user, complaint)
    data["can_work"] = can_work_on_complaint(g.current_user, complaint)
    return data


def _get(complaint_id):
    complaint = complaint_service.get_complaint_or_404(complaint_id)
    if not can_view_complaint(g.current_user, complaint):
        raise ApiError("Complaint not found", 404)
    return complaint


@bp.get("/summary")
@staff_required
def summary():
    return jsonify(dashboard_service.municipal_summary(g.current_user))


@bp.get("/sort-options")
@staff_required
def sort_options():
    return jsonify({"fields": municipal_query_service.SORT_FIELDS, "default": municipal_query_service.DEFAULT_SORT})


@bp.get("/complaints")
@staff_required
def complaints():
    return jsonify(municipal_query_service.query_complaints(g.current_user, request.args))


@bp.get("/complaints/<int:complaint_id>")
@staff_required
def complaint_detail(complaint_id):
    return jsonify({"complaint": _detail(_get(complaint_id))})


@bp.get("/complaints/<int:complaint_id>/activity")
@staff_required
def activity(complaint_id):
    complaint = _get(complaint_id)
    return jsonify({
        "assignments": [a.to_dict() for a in complaint.assignments],
        "audit": [a.to_dict() for a in audit_service.for_complaint(complaint.id)],
    })


@bp.post("/complaints/<int:complaint_id>/status")
@staff_required
def update_status(complaint_id):
    data = request.get_json(silent=True) or {}
    complaint = _get(complaint_id)
    complaint_service.change_status(complaint, g.current_user, data.get("status"), data.get("note"),
                                    parse_bool(data.get("is_internal")))
    return jsonify({"complaint": _detail(complaint)})


@bp.post("/complaints/<int:complaint_id>/assign")
@officer_required
def assign(complaint_id):
    data = request.get_json(silent=True) or {}
    complaint = _get(complaint_id)
    complaint_service.assign_worker(complaint, g.current_user, data.get("worker_id"), data.get("note"), data.get("deadline"))
    return jsonify({"complaint": _detail(complaint)})


@bp.post("/complaints/<int:complaint_id>/transfer")
@officer_required
def transfer(complaint_id):
    data = request.get_json(silent=True) or {}
    complaint = complaint_service.get_complaint_or_404(complaint_id)
    if g.current_user.role != "admin" and not can_view_complaint(g.current_user, complaint):
        raise ApiError("Complaint not found", 404)
    complaint_service.transfer_office(complaint, g.current_user, data.get("office_id"), data.get("ward_id"), data.get("note"))
    return jsonify({"complaint": complaint.to_dict(viewer=g.current_user, detail=True)})


@bp.post("/complaints/<int:complaint_id>/notes")
@staff_required
def add_note(complaint_id):
    complaint = _get(complaint_id)
    complaint_service.add_note(complaint, g.current_user, (request.get_json(silent=True) or {}).get("note"))
    return jsonify({"complaint": _detail(complaint)}), 201


@bp.get("/workers")
@officer_required
def workers():
    return jsonify({"workers": complaint_service.field_workers(g.current_user, request.args.get("office_id"))})


@bp.get("/wards")
@staff_required
def wards():
    query = Ward.query.filter(Ward.is_active.is_(True))
    if g.current_user.role != "admin":
        query = query.filter(Ward.office_id == (g.current_user.office_id or -1))
    elif request.args.get("office_id"):
        query = query.filter(Ward.office_id == int(request.args["office_id"]))
    return jsonify({"wards": [w.to_dict() for w in query.order_by(Ward.name).all()]})


@bp.get("/offices")
@staff_required
def offices():
    from ..models import Office

    return jsonify({"offices": [o.to_dict() for o in Office.query.filter_by(is_active=True).order_by(Office.name).all()]})


@bp.get("/alerts")
@officer_required
def alerts():
    return jsonify(alert_service.list_alerts(g.current_user, request.args))


@bp.get("/alerts/count")
@officer_required
def alerts_count():
    return jsonify({"unacknowledged": alert_service.unacknowledged_count(g.current_user)})


@bp.post("/alerts/<int:alert_id>/acknowledge")
@officer_required
def acknowledge(alert_id):
    alert = alert_service.get_alert_or_404(alert_id, g.current_user)
    alert_service.acknowledge(alert, g.current_user, (request.get_json(silent=True) or {}).get("note"))
    return jsonify({"alert": alert.to_dict(alert_service.actions_for([alert.id]).get(alert.id))})


@bp.post("/alerts/<int:alert_id>/actions")
@officer_required
def alert_action(alert_id):
    alert = alert_service.get_alert_or_404(alert_id, g.current_user)
    alert_service.add_action(alert, g.current_user, (request.get_json(silent=True) or {}).get("note"))
    return jsonify({"alert": alert.to_dict(alert_service.actions_for([alert.id]).get(alert.id))}), 201
