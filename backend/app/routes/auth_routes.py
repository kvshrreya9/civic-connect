from flask import Blueprint, g, jsonify, request

from ..services import auth_service
from ..utils.permissions import login_required

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@bp.post("/register")
def register():
    user = auth_service.register_user(request.get_json(silent=True) or {})
    return jsonify({"access_token": auth_service.create_token(user), "user": user.to_dict()}), 201


@bp.post("/login")
def login():
    """Citizen login (portal defaults to 'citizen')."""
    data = request.get_json(silent=True) or {}
    data.setdefault("portal", "citizen")
    user = auth_service.authenticate(data)
    return jsonify({"access_token": auth_service.create_token(user), "user": user.to_dict()})


@bp.post("/municipal/login")
def municipal_login():
    data = request.get_json(silent=True) or {}
    data["portal"] = "municipal"
    user = auth_service.authenticate(data)
    return jsonify({"access_token": auth_service.create_token(user), "user": user.to_dict()})


@bp.post("/logout")
@login_required
def logout():
    # Tokens are stateless JWTs; the client discards them. Endpoint exists for a uniform API.
    return jsonify({"ok": True})


@bp.get("/me")
@login_required
def me():
    return jsonify({"user": g.current_user.to_dict()})


@bp.put("/me")
@login_required
def update_me():
    user = auth_service.update_profile(g.current_user, request.get_json(silent=True) or {})
    return jsonify({"user": user.to_dict()})
