import logging
import os

from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException

from .config import get_config
from .extensions import cors, db, jwt, migrate


def create_app(config_class=None):
    app = Flask(__name__)
    app.config.from_object(config_class or get_config())
    logging.basicConfig(level=logging.INFO)

    if not app.config.get("SECRETS_FROM_ENV"):
        app.logger.warning(
            "SECRET_KEY / JWT_SECRET_KEY not set in backend/.env - using a temporary random key. "
            "Login tokens will be invalidated on every restart."
        )

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        expose_headers=["Idempotency-Key"],
    )

    from . import models  # noqa: F401  (register models with SQLAlchemy)
    from .services.after_commit import register_after_commit

    register_after_commit()
    from .routes import register_blueprints
    from .tasks.complaint_sync import maybe_run_periodic, register_commands

    register_blueprints(app)
    register_commands(app)
    _register_error_handlers(app)
    _register_jwt_handlers()

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "service": "civicconnect-api"})

    @app.before_request
    def _periodic_jobs():
        if not app.config.get("TESTING"):
            maybe_run_periodic(app)

    if app.config.get("AUTO_CREATE_TABLES"):
        with app.app_context():
            try:
                db.create_all()
                from .schema_upgrade import upgrade_schema
                from .services.department_routing_service import ensure_default_departments

                upgrade_schema()
                ensure_default_departments()
            except Exception as exc:  # database may be unreachable at boot
                db.session.rollback()
                app.logger.error("Database initialisation failed: %s", exc)

    return app


def _register_error_handlers(app):
    from .utils.validators import ApiError

    @app.errorhandler(ApiError)
    def handle_api_error(error):
        db.session.rollback()
        return jsonify(error.to_dict()), error.status_code

    @app.errorhandler(HTTPException)
    def handle_http_error(error):
        message = error.description or error.name
        if error.code == 413:
            message = "Upload is too large. Please attach smaller or fewer images."
        return jsonify({"error": message}), error.code

    @app.errorhandler(Exception)
    def handle_unexpected(error):
        if isinstance(error, HTTPException):
            return handle_http_error(error)
        db.session.rollback()
        app.logger.exception("Unhandled error: %s", error)
        return jsonify({"error": "Internal server error"}), 500


def _register_jwt_handlers():
    @jwt.unauthorized_loader
    def missing_token(reason):
        return jsonify({"error": "Authentication required"}), 401

    @jwt.invalid_token_loader
    def invalid_token(reason):
        return jsonify({"error": "Invalid session token"}), 401

    @jwt.expired_token_loader
    def expired_token(header, payload):
        return jsonify({"error": "Your session has expired. Please log in again."}), 401
