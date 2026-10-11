import re
import secrets

from flask import current_app
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from ..extensions import utcnow

SAFE_FILENAME_RE = re.compile(r"^(?:(?:report|resolution)/)?[a-f0-9]{32}\.jpg$")


def generate_reference():
    """Human-friendly complaint reference such as CC-2026-4F9A1C."""
    return f"CC-{utcnow().year}-{secrets.token_hex(3).upper()}"


def is_safe_stored_filename(filename):
    return bool(filename) and bool(SAFE_FILENAME_RE.match(filename)) and ".." not in filename


def _image_serializer():
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt="civicconnect-image")


def signed_image_url(filename):
    token = _image_serializer().dumps(filename)
    return f"/api/images/{filename}?t={token}"


def verify_image_token(filename, token):
    if not token:
        return False
    try:
        value = _image_serializer().loads(token, max_age=current_app.config["IMAGE_URL_TTL_SECONDS"])
    except (BadSignature, SignatureExpired):
        return False
    return value == filename


def mask_email(email):
    if not email or "@" not in email:
        return email
    local, domain = email.split("@", 1)
    visible = local[:2] if len(local) > 2 else local[:1]
    return f"{visible}{'*' * max(1, len(local) - len(visible))}@{domain}"


def security_headers(response):
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    return response
