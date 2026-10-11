from datetime import timedelta

from flask import current_app
from flask_jwt_extended import create_access_token

from ..extensions import db, utcnow
from ..models import Office, User, Ward
from ..models.user import STAFF_ROLES
from ..utils.validators import (
    ApiError, PHONE_RE, clean_text, parse_int, validate_email, validate_login, validate_password, validate_registration,
)
from . import audit_service

_failed_logins = {}
PORTALS = ("citizen", "municipal")


def _check_lockout(email):
    window = timedelta(minutes=current_app.config["LOGIN_LOCKOUT_MINUTES"])
    attempts = [t for t in _failed_logins.get(email, []) if utcnow() - t < window]
    _failed_logins[email] = attempts
    if len(attempts) >= current_app.config["LOGIN_MAX_ATTEMPTS"]:
        raise ApiError("Too many failed attempts. Please try again in a few minutes.", 429)


def _record_failure(email):
    _failed_logins.setdefault(email, []).append(utcnow())


def register_user(data):
    """Public self-registration always creates a citizen account."""
    cleaned = validate_registration(data)
    if User.query.filter_by(email=cleaned["email"]).first():
        raise ApiError("An account with this email already exists", 409, {"email": "Email already registered"})
    user = User(name=cleaned["name"], email=cleaned["email"], phone=cleaned["phone"], role="citizen")
    user.set_password(cleaned["password"])
    db.session.add(user)
    db.session.commit()
    return user


def authenticate(data):
    email, password = validate_login(data)
    portal = (data.get("portal") or "citizen").lower()
    if portal not in PORTALS:
        raise ApiError("Unknown login portal", 422)
    _check_lockout(email)
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        _record_failure(email)
        raise ApiError("Invalid email or password", 401)
    if not user.is_active:
        raise ApiError("This account has been deactivated", 403)
    if portal == "citizen" and user.is_staff:
        raise ApiError("Municipal staff must sign in through the Municipality / Panchayat login", 403)
    if portal == "municipal" and not user.is_staff:
        raise ApiError("This login is for municipal and panchayat staff. Citizens use the citizen login.", 403)
    if portal == "municipal":
        selected_office = data.get("office_id")
        if selected_office and user.role == "admin":
            if selected_office != "all":
                raise ApiError("Select Administrator / All offices for this account", 403)
        elif selected_office and str(user.office_id) != str(selected_office):
            raise ApiError("Select the municipality assigned to this account", 403)
    _failed_logins.pop(email, None)
    if user.is_staff:
        audit_service.record("auth.staff_login", "user", user.id, actor=user)
        db.session.commit()
    return user


def create_token(user):
    return create_access_token(identity=str(user.id), additional_claims={"role": user.role})


def update_profile(user, data):
    errors = {}
    if "name" in data:
        name = clean_text(data.get("name"), 120)
        if len(name) < 2:
            errors["name"] = "Please enter your full name"
        else:
            user.name = name
    if "phone" in data:
        phone = clean_text(data.get("phone"), 32)
        if phone and not PHONE_RE.match(phone):
            errors["phone"] = "Please enter a valid phone number"
        else:
            user.phone = phone or None
    if errors:
        raise ApiError("Please fix the highlighted fields", 422, errors)
    db.session.commit()
    return user


def _resolve_scope(role, office_id, ward_id):
    office = ward = None
    if role in ("officer", "field_worker"):
        office = db.session.get(Office, parse_int(office_id)) if office_id else None
        if not office:
            raise ApiError("Officers and field workers must belong to an office", 422, {"office_id": "Required"})
    if ward_id:
        ward = db.session.get(Ward, parse_int(ward_id))
        if not ward or not office or ward.office_id != office.id:
            raise ApiError("Ward must belong to the selected office", 422, {"ward_id": "Invalid ward"})
    return office, ward


def create_staff(admin, data):
    """Municipal accounts are created only by an administrator."""
    errors = {}
    name = clean_text(data.get("name"), 120)
    email = clean_text(data.get("email"), 255).lower()
    role = clean_text(data.get("role"), 20)
    password = data.get("password") or ""
    phone = clean_text(data.get("phone"), 32) or None
    if len(name) < 2:
        errors["name"] = "Enter the staff member's name"
    if not validate_email(email):
        errors["email"] = "Enter a valid email"
    if role not in ("officer", "field_worker", "admin"):
        errors["role"] = "Role must be officer, field_worker or admin"
    password_error = validate_password(password)
    if password_error:
        errors["password"] = password_error
    if phone and not PHONE_RE.match(phone):
        errors["phone"] = "Invalid phone number"
    if errors:
        raise ApiError("Please fix the highlighted fields", 422, errors)
    if User.query.filter_by(email=email).first():
        raise ApiError("An account with this email already exists", 409, {"email": "Already registered"})
    office, ward = _resolve_scope(role, data.get("office_id"), data.get("ward_id"))
    user = User(name=name, email=email, role=role, phone=phone, office=office, ward=ward, created_by_id=admin.id)
    user.set_password(password)
    db.session.add(user)
    db.session.flush()
    audit_service.record("staff.created", "user", user.id, actor=admin, role=role,
                         office_id=office.id if office else None, ward_id=ward.id if ward else None)
    db.session.commit()
    return user


def update_staff(admin, user, data):
    if user.role not in STAFF_ROLES:
        raise ApiError("Only staff accounts can be managed here", 400)
    if user.id == admin.id and data.get("is_active") is False:
        raise ApiError("You cannot deactivate your own account", 400)
    changes = {}
    if "name" in data:
        name = clean_text(data.get("name"), 120)
        if len(name) < 2:
            raise ApiError("Enter the staff member's name", 422)
        user.name = changes["name"] = name
    if "phone" in data:
        user.phone = changes["phone"] = clean_text(data.get("phone"), 32) or None
    role = data.get("role", user.role if user.role != "employee" else "officer")
    if role not in ("officer", "field_worker", "admin"):
        raise ApiError("Role must be officer, field_worker or admin", 422)
    if "role" in data or "office_id" in data or "ward_id" in data:
        office, ward = _resolve_scope(role, data.get("office_id", user.office_id), data.get("ward_id"))
        user.role, user.office, user.ward = role, office, ward
        changes.update(role=role, office_id=office.id if office else None, ward_id=ward.id if ward else None)
    if "is_active" in data:
        user.is_active = changes["is_active"] = bool(data.get("is_active"))
    if data.get("password"):
        error = validate_password(data["password"])
        if error:
            raise ApiError(error, 422)
        user.set_password(data["password"])
        changes["password"] = "reset"
    audit_service.record("staff.updated", "user", user.id, actor=admin, **changes)
    db.session.commit()
    return user
