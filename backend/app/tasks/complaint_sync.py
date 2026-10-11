"""Periodic SLA / risk / deadline synchronisation plus Flask CLI commands."""
import threading
import time

import click

from ..extensions import db

_lock = threading.Lock()
_last_run = 0.0


def run_sync():
    from ..services import priority_service, sla_service

    escalated = sla_service.check_escalations()
    recalculated = priority_service.recalculate_open()  # also re-evaluates risk (may raise alerts)
    warnings = sla_service.check_deadline_warnings()
    return {"escalated": escalated, "recalculated": recalculated, "deadline_warnings": warnings}


def maybe_run_periodic(app):
    """Lightweight scheduler: piggybacks on requests, at most once per PERIODIC_SYNC_MINUTES."""
    global _last_run
    interval = app.config.get("PERIODIC_SYNC_MINUTES", 10) * 60
    if interval <= 0 or time.time() - _last_run < interval:
        return
    if not _lock.acquire(blocking=False):
        return
    try:
        _last_run = time.time()
        run_sync()
    except Exception as exc:
        db.session.rollback()
        app.logger.warning("Periodic sync skipped: %s", exc)
    finally:
        _lock.release()


def register_commands(app):
    @app.cli.command("init-db")
    def init_db():
        """Create missing tables/columns and default departments (never drops data)."""
        from ..schema_upgrade import upgrade_schema
        from ..services.department_routing_service import ensure_default_departments

        db.create_all()
        added = upgrade_schema()
        departments = ensure_default_departments()
        click.echo(f"Schema ensured. Columns added: {len(added)}. Departments added: {departments}")

    @app.cli.command("create-admin")
    @click.option("--email", prompt=True)
    @click.option("--name", prompt=True)
    @click.password_option()
    def create_admin(email, name, password):
        """Create the first administrator account."""
        from ..models import User
        from ..utils.validators import validate_email, validate_password

        email = email.strip().lower()
        if not validate_email(email):
            raise click.ClickException("Invalid email")
        error = validate_password(password)
        if error:
            raise click.ClickException(error)
        if User.query.filter_by(email=email).first():
            raise click.ClickException("An account with this email already exists")
        user = User(name=name.strip(), email=email, role="admin")
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        click.echo(f"Administrator {email} created.")

    @app.cli.command("seed-demo")
    @click.option("--with-complaints", is_flag=True, help="Also create sample complaints (statistics will no longer be 0)")
    def seed_demo(with_complaints):
        """Demo offices, wards and staff accounts. No complaints unless --with-complaints."""
        from ..seed import seed_demo_data

        click.echo(seed_demo_data(with_complaints=with_complaints))

    @app.cli.command("remove-demo-complaints")
    @click.option("--yes", is_flag=True, help="Confirm deletion")
    def remove_demo_complaints(yes):
        """Delete ONLY complaints reported by @civicconnect.demo accounts (and their photos/alerts)."""
        from ..seed import remove_demo_complaints as remove

        if not yes:
            raise click.ClickException("This deletes demo complaints. Re-run with --yes to confirm.")
        click.echo(remove())

    @app.cli.command("sla-check")
    def sla_check():
        """Escalate overdue complaints, recalculate priority/risk, send deadline warnings."""
        click.echo(run_sync())

    @app.cli.command("recalc-priority")
    def recalc_priority():
        from ..services import priority_service

        click.echo(f"Recalculated {priority_service.recalculate_open()} open complaints")

    @app.cli.command("reroute-unmapped")
    def reroute_unmapped():
        """Re-run location routing for complaints without an office (after adding wards)."""
        from ..services.jurisdiction_service import reroute_unmapped as reroute

        click.echo(f"Routed {reroute()} complaints")

    @app.cli.command("images-maintenance")
    @click.option("--delete-orphans", is_flag=True, help="Delete unreferenced files instead of listing them")
    def images_maintenance(delete_orphans):
        from .image_processing import backfill_missing_hashes, cleanup_orphan_files

        click.echo(f"Hashes backfilled: {backfill_missing_hashes()}")
        orphans = cleanup_orphan_files(dry_run=not delete_orphans)
        click.echo(f"Orphan files {'deleted' if delete_orphans else 'found'}: {len(orphans)}")
