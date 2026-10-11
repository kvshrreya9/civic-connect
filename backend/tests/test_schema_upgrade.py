from sqlalchemy import inspect, text

from app.extensions import db
from app.schema_upgrade import upgrade_schema


def test_upgrade_adds_missing_columns_without_losing_data(app):
    with db.engine.begin() as conn:
        for index in ("ix_complaints_report_count", "ix_complaints_risk_level", "ix_notifications_dedupe_key"):
            conn.execute(text(f"DROP INDEX IF EXISTS {index}"))
        conn.execute(text("ALTER TABLE complaints DROP COLUMN report_count"))
        conn.execute(text("ALTER TABLE complaints DROP COLUMN risk_level"))
        conn.execute(text("ALTER TABLE notifications DROP COLUMN dedupe_key"))
        conn.execute(text(
            "INSERT INTO users (name, email, password_hash, role, is_active, created_at) "
            "VALUES ('Old', 'old@example.com', 'x', 'citizen', 1, CURRENT_TIMESTAMP)"))
        conn.execute(text(
            "INSERT INTO complaints (reference, title, description, category, severity, safety_risk, affected_count, "
            "latitude, longitude, status, priority_score, priority_breakdown, citizen_id, escalated, support_count, "
            "possible_duplicate, created_at, updated_at) VALUES ('CC-OLD-1', 'Old', 'Old complaint text', 'pothole', "
            "'high', 0, 1, 13.08, 80.27, 'resolved', 10, '{}', 1, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"))
    added = upgrade_schema()
    assert {"complaints.report_count", "complaints.risk_level", "notifications.dedupe_key"} <= set(added)
    columns = {c["name"] for c in inspect(db.engine).get_columns("complaints")}
    assert {"office_id", "risk_level", "report_count"} <= columns
    with db.engine.connect() as conn:
        status, reports = conn.execute(
            text("SELECT status, report_count FROM complaints WHERE reference='CC-OLD-1'")).one()
    assert status == "resolution_submitted" and reports == 1
    assert upgrade_schema() == []  # idempotent
