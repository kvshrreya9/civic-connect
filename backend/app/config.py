import os
import secrets
import tempfile
from datetime import timedelta
from urllib.parse import quote_plus

from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(BASE_DIR, ".env"))


def _bool(name, default=False):
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    return value.strip().lower() in ("1", "true", "yes", "on")


def _float(name, default):
    try:
        return float(os.getenv(name, default))
    except (TypeError, ValueError):
        return float(default)


def build_database_url():
    """Use DATABASE_URL when present, otherwise compose one from DB_* variables."""
    url = os.getenv("DATABASE_URL", "").strip()
    if url:
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url
    name = os.getenv("DB_NAME", "civicconnect")
    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "5432")
    user = os.getenv("DB_USER", "").strip()
    password = os.getenv("DB_PASSWORD", "")
    credentials = ""
    if user:
        credentials = quote_plus(user)
        if password:
            credentials += ":" + quote_plus(password)
        credentials += "@"
    return f"postgresql://{credentials}{host}:{port}/{name}"


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY") or secrets.token_hex(32)
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY") or SECRET_KEY
    SECRETS_FROM_ENV = bool(os.getenv("SECRET_KEY") or os.getenv("JWT_SECRET_KEY"))
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.getenv("JWT_EXPIRES_HOURS", "12")))

    SQLALCHEMY_DATABASE_URI = build_database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}
    AUTO_CREATE_TABLES = _bool("AUTO_CREATE_TABLES", True)

    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER") or os.path.join(BASE_DIR, "uploads")
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_UPLOAD_MB", "30")) * 1024 * 1024
    MAX_IMAGES_PER_COMPLAINT = 5
    MAX_IMAGE_BYTES = 10 * 1024 * 1024
    IMAGE_MAX_DIMENSION = 1600
    IMAGE_JPEG_QUALITY = 82
    ENABLE_FACE_BLUR = _bool("ENABLE_FACE_BLUR", True)

    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
        if origin.strip()
    ]

    GEOCODER_ENABLED = _bool("GEOCODER_ENABLED", True)
    GEOCODER_URL = os.getenv("GEOCODER_URL", "https://nominatim.openstreetmap.org").rstrip("/")
    GEOCODER_USER_AGENT = os.getenv("GEOCODER_USER_AGENT", "CivicConnect/1.0 (hackathon civic-tech demo)")
    GEOCODER_TIMEOUT = 6

    DUPLICATE_RADIUS_M = 150
    DUPLICATE_WINDOW_DAYS = 30
    DUPLICATE_THRESHOLD = 0.45
    PRIORITY_NEARBY_RADIUS_M = 500
    PERIODIC_SYNC_MINUTES = int(os.getenv("PERIODIC_SYNC_MINUTES", "10"))

    LOGIN_MAX_ATTEMPTS = 5
    LOGIN_LOCKOUT_MINUTES = 15

    IMAGE_URL_TTL_SECONDS = int(os.getenv("IMAGE_URL_TTL_SECONDS", "21600"))

    # Related-report counting (same category within radius, unique citizens)
    RELATED_RADIUS_M = int(os.getenv("RELATED_RADIUS_M", "200"))
    RELATED_WINDOW_DAYS = int(os.getenv("RELATED_WINDOW_DAYS", "60"))
    WIDESPREAD_REPORT_THRESHOLD = int(os.getenv("WIDESPREAD_REPORT_THRESHOLD", "5"))

    # Rule-based risk classification (points thresholds, see docs/risk-and-alerts.md)
    RISK_CRITICAL_POINTS = int(os.getenv("RISK_CRITICAL_POINTS", "5"))
    RISK_HIGH_POINTS = int(os.getenv("RISK_HIGH_POINTS", "3"))
    RISK_MEDIUM_POINTS = int(os.getenv("RISK_MEDIUM_POINTS", "2"))
    RISK_AFFECTED_THRESHOLD = int(os.getenv("RISK_AFFECTED_THRESHOLD", "50"))
    RISK_RELATED_THRESHOLD = int(os.getenv("RISK_RELATED_THRESHOLD", "3"))
    DEFAULT_CRITICAL_RESPONSE_MINUTES = int(os.getenv("DEFAULT_CRITICAL_RESPONSE_MINUTES", "60"))
    DEFAULT_HIGH_RESPONSE_MINUTES = int(os.getenv("DEFAULT_HIGH_RESPONSE_MINUTES", "240"))
    DEADLINE_WARNING_HOURS = int(os.getenv("DEADLINE_WARNING_HOURS", "12"))

    # Optional external alert channels. In-app notifications always work without these.
    SMTP_HOST = os.getenv("SMTP_HOST", "")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM = os.getenv("SMTP_FROM", "")
    SMTP_USE_TLS = _bool("SMTP_USE_TLS", True)
    SMS_WEBHOOK_URL = os.getenv("SMS_WEBHOOK_URL", "")
    SMS_WEBHOOK_TOKEN = os.getenv("SMS_WEBHOOK_TOKEN", "")
    TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER", "")

    DEMO_CENTER_LAT = _float("DEMO_CENTER_LAT", 13.0827)
    DEMO_CENTER_LNG = _float("DEMO_CENTER_LNG", 80.2707)
    DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "CivicDemo@2026")


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_ENGINE_OPTIONS = {}
    AUTO_CREATE_TABLES = False
    SECRET_KEY = "test-secret-key-for-automated-tests-only-0001"
    JWT_SECRET_KEY = "test-jwt-secret-key-for-automated-tests-0001"
    SECRETS_FROM_ENV = True
    GEOCODER_ENABLED = False
    ENABLE_FACE_BLUR = False
    UPLOAD_FOLDER = tempfile.mkdtemp(prefix="civicconnect-test-")
    PERIODIC_SYNC_MINUTES = 0
    SMTP_HOST = ""
    SMS_WEBHOOK_URL = ""
    TWILIO_ACCOUNT_SID = ""
    TWILIO_AUTH_TOKEN = ""
    TWILIO_FROM_NUMBER = ""


def get_config():
    if os.getenv("APP_ENV", "development").lower() == "testing":
        return TestingConfig
    return Config
