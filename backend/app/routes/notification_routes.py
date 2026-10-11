from flask import Blueprint, g, jsonify

from ..services import notification_service
from ..utils.permissions import login_required
from ..utils.validators import ApiError

bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")


@bp.get("")
@login_required
def list_notifications():
    from flask import request

    items, unread = notification_service.list_for_user(
        g.current_user, unread_only=request.args.get("unread") in ("1", "true")
    )
    return jsonify({"items": [n.to_dict() for n in items], "unread": unread})


@bp.post("/<int:notification_id>/read")
@login_required
def mark_read(notification_id):
    notification = notification_service.mark_read(g.current_user, notification_id)
    if not notification:
        raise ApiError("Notification not found", 404)
    return jsonify({"notification": notification.to_dict()})


@bp.post("/read-all")
@login_required
def mark_all_read():
    return jsonify({"updated": notification_service.mark_all_read(g.current_user)})
