import re
from datetime import datetime, timedelta

CATEGORIES = (
    "pothole",
    "road_damage",
    "garbage",
    "water_leakage",
    "drainage",
    "streetlight",
    "tree_hazard",
    "other",
)
SEVERITIES = ("low", "medium", "high", "critical")
EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")
PHONE_RE = re.compile(r"^[0-9+\-\s()]{6,20}$")
CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


class ApiError(Exception):
    def __init__(self, message, status_code=400, errors=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.errors = errors or {}

    def to_dict(self):
        payload = {"error": self.message}
        if self.errors:
            payload["errors"] = self.errors
        return payload


def clean_text(value, max_length=None):
    if value is None:
        return ""
    text = CONTROL_CHARS_RE.sub("", str(value)).strip()
    if max_length:
        text = text[:max_length]
    return text


def parse_bool(value):
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    return str(value).strip().lower() in ("1", "true", "yes", "on")


def parse_int(value, default=None, minimum=None, maximum=None):
    try:
        number = int(value)
    except (TypeError, ValueError):
        return default
    if minimum is not None:
        number = max(minimum, number)
    if maximum is not None:
        number = min(maximum, number)
    return number


def validate_email(email):
    return bool(email) and len(email) <= 255 and bool(EMAIL_RE.match(email))


def validate_password(password):
    if not password or len(password) < 8:
        return "Password must be at least 8 characters"
    if len(password) > 128:
        return "Password is too long"
    if not re.search(r"[A-Za-z]", password) or not re.search(r"[0-9]", password):
        return "Password must contain letters and numbers"
    return None


def validate_registration(data):
    errors = {}
    name = clean_text(data.get("name"), 120)
    email = clean_text(data.get("email"), 255).lower()
    phone = clean_text(data.get("phone"), 32)
    password = data.get("password") or ""
    if len(name) < 2:
        errors["name"] = "Please enter your full name"
    if not validate_email(email):
        errors["email"] = "Please enter a valid email address"
    if phone and not PHONE_RE.match(phone):
        errors["phone"] = "Please enter a valid phone number"
    password_error = validate_password(password)
    if password_error:
        errors["password"] = password_error
    if errors:
        raise ApiError("Please fix the highlighted fields", 422, errors)
    return {"name": name, "email": email, "phone": phone or None, "password": password}


def validate_login(data):
    email = clean_text(data.get("email"), 255).lower()
    password = data.get("password") or ""
    if not email or not password:
        raise ApiError("Email and password are required", 422)
    return email, password


def validate_coordinates(latitude, longitude):
    try:
        lat = float(latitude)
        lng = float(longitude)
    except (TypeError, ValueError):
        raise ApiError("A valid location is required", 422, {"location": "Pick the issue location on the map"})
    if not (-90 <= lat <= 90) or not (-180 <= lng <= 180) or (lat == 0 and lng == 0):
        raise ApiError("Location coordinates are out of range", 422, {"location": "Invalid coordinates"})
    return lat, lng


def validate_complaint_payload(data):
    errors = {}
    title = clean_text(data.get("title"), 160)
    description = clean_text(data.get("description"), 4000)
    category = clean_text(data.get("category"), 40).lower()
    severity = clean_text(data.get("severity") or "medium", 20).lower()
    address = clean_text(data.get("address"), 500)
    affected = parse_int(data.get("affected_count"), default=0)

    if len(title) < 5:
        errors["title"] = "Title must be at least 5 characters"
    if len(description) < 15:
        errors["description"] = "Describe the issue in at least 15 characters"
    if category not in CATEGORIES:
        errors["category"] = "Choose a valid category"
    if severity not in SEVERITIES:
        errors["severity"] = "Choose a valid severity"
    if affected is None or affected < 0 or affected > 100000:
        errors["affected_count"] = "Affected citizens must be between 0 and 100000"
    try:
        latitude, longitude = validate_coordinates(data.get("latitude"), data.get("longitude"))
    except ApiError as exc:
        errors.update(exc.errors)
        latitude = longitude = None
    if errors:
        raise ApiError("Please fix the highlighted fields", 422, errors)
    return {
        "title": title,
        "description": description,
        "category": category,
        "severity": severity,
        "safety_risk": parse_bool(data.get("safety_risk")),
        "affected_count": affected,
        "latitude": latitude,
        "longitude": longitude,
        "address": address,
    }


def pagination_args(args, default_per_page=20, max_per_page=100):
    page = parse_int(args.get("page"), default=1, minimum=1)
    per_page = parse_int(args.get("per_page"), default=default_per_page, minimum=1, maximum=max_per_page)
    return page, per_page


def parse_date(value, end=False):
    """Parse YYYY-MM-DD (or ISO datetime). end=True returns the end of that day."""
    if not value:
        return None
    text = str(value).strip().replace("Z", "")
    try:
        if len(text) == 10:
            day = datetime.strptime(text, "%Y-%m-%d")
            return day + timedelta(days=1) - timedelta(microseconds=1) if end else day
        return datetime.fromisoformat(text).replace(tzinfo=None)
    except ValueError:
        raise ApiError(f"Invalid date '{value}'. Use YYYY-MM-DD.", 422)


def parse_float(value, name, minimum=None, maximum=None):
    if value in (None, ""):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise ApiError(f"{name} must be a number", 422)
    if (minimum is not None and number < minimum) or (maximum is not None and number > maximum):
        raise ApiError(f"{name} is out of range", 422)
    return number
