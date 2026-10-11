from flask import Blueprint, g, jsonify

from ..services import dashboard_service
from ..utils.permissions import login_required, roles_required

bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


@bp.get("/public")
def public():
    return jsonify(dashboard_service.public_stats())


@bp.get("/citizen")
@login_required
def citizen():
    return jsonify(dashboard_service.citizen_summary(g.current_user))


@bp.get("/employee")
@roles_required("employee", "officer", "field_worker", "admin")
def employee():
    return jsonify(dashboard_service.municipal_summary(g.current_user))
