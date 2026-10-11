def register_blueprints(app):
    from ..utils.security import security_headers
    from .auth_routes import bp as auth_bp
    from .complaint_routes import bp as complaint_bp
    from .dashboard_routes import bp as dashboard_bp
    from .department_routes import bp as department_bp
    from .duplicate_routes import bp as duplicate_bp
    from .employee_routes import bp as employee_bp
    from .image_routes import bp as image_bp
    from .location_routes import bp as location_bp
    from .notification_routes import bp as notification_bp
    from .priority_routes import bp as priority_bp
    from .verification_routes import bp as verification_bp
    from .municipal_routes import bp as municipal_bp
    from .admin_routes import bp as admin_bp

    for blueprint in (
        auth_bp, complaint_bp, location_bp, duplicate_bp, priority_bp, employee_bp,
        department_bp, dashboard_bp, image_bp, verification_bp, notification_bp, municipal_bp, admin_bp,
    ):
        app.register_blueprint(blueprint)
    app.after_request(security_headers)
