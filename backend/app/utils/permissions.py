"""Role and jurisdiction checks. Every protected API enforces these server-side."""
from functools import wraps

from flask import g, jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from ..extensions import db
from ..models import User
from ..models.user import OFFICER_ROLES, STAFF_ROLES


def get_current_user():
    identity = get_jwt_identity()
    if identity is None:
        return None
    try:
        user_id = int(identity)
    except (TypeError, ValueError):
        return None
    user = db.session.get(User, user_id)
    if not user or not user.is_active:
        return None
    return user


def optional_user():
    try:
        verify_jwt_in_request(optional=True)
    except Exception:
        return None
    return get_current_user()


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user = get_current_user()
        if not user:
            return jsonify({"error": "Authentication required"}), 401
        g.current_user = user
        return fn(*args, **kwargs)

    return wrapper


def roles_required(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user = get_current_user()
            if not user:
                return jsonify({"error": "Authentication required"}), 401
            if user.role not in roles:
                return jsonify({"error": "You do not have permission to perform this action"}), 403
            g.current_user = user
            return fn(*args, **kwargs)

        return wrapper

    return decorator


staff_required = roles_required(*STAFF_ROLES)
officer_required = roles_required(*OFFICER_ROLES)
admin_required = roles_required("admin")


def in_jurisdiction(user, complaint):
    """Officer jurisdiction: their office (and ward, if they are ward-scoped).
    Legacy department employees without an office keep department-based access."""
    if not user or not complaint:
        return False
    if user.role == "admin":
        return True
    if user.office_id:
        if complaint.office_id != user.office_id:
            return False
        return not user.ward_id or complaint.ward_id == user.ward_id
    if user.role == "employee" and user.department_id:
        return complaint.department_id == user.department_id
    return False


def can_view_complaint(user, complaint):
    if not user or not complaint:
        return False
    if user.role == "citizen":
        return complaint.citizen_id == user.id
    if user.role == "field_worker":
        return complaint.assigned_to_id == user.id
    if user.role in OFFICER_ROLES:
        return in_jurisdiction(user, complaint)
    return False


def can_manage_complaint(user, complaint):
    """Officers / admins managing a complaint (assign, status, transfer, notes)."""
    return bool(user) and user.role in OFFICER_ROLES and in_jurisdiction(user, complaint)


def can_work_on_complaint(user, complaint):
    """Field work on a complaint: the assigned field worker, or a managing officer."""
    if not user or not complaint:
        return False
    if user.role == "field_worker":
        return complaint.assigned_to_id == user.id
    return can_manage_complaint(user, complaint)


def jurisdiction_query(query, user, model):
    """Restrict a Complaint query to what this staff user is allowed to see."""
    if user.role == "admin":
        return query
    if user.role == "field_worker":
        return query.filter(model.assigned_to_id == user.id)
    if user.office_id:
        query = query.filter(model.office_id == user.office_id)
        if user.ward_id:
            query = query.filter(model.ward_id == user.ward_id)
        return query
    if user.role == "employee" and user.department_id:
        return query.filter(model.department_id == user.department_id)
    return query.filter(model.id == -1)
