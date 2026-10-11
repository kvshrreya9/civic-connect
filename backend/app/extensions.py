from datetime import datetime, timezone

from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
cors = CORS()


def utcnow():
    """Naive UTC timestamp, consistent across PostgreSQL and SQLite."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def iso(value):
    if value is None:
        return None
    return value.replace(microsecond=0).isoformat() + "Z"
