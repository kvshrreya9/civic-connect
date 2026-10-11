import re

from ..models import Complaint
from .validators import ApiError

KEY_RE = re.compile(r"^[A-Za-z0-9_\-]{8,64}$")


def get_idempotency_key(req):
    """Read a client-generated request id from the header or form body."""
    key = req.headers.get("Idempotency-Key") or req.form.get("client_request_id")
    if not key:
        payload = req.get_json(silent=True) or {}
        key = payload.get("client_request_id")
    if not key:
        return None
    key = str(key).strip()
    if not KEY_RE.match(key):
        raise ApiError("Invalid Idempotency-Key format", 400)
    return key


def find_existing(key):
    if not key:
        return None
    return Complaint.query.filter_by(client_request_id=key).first()
