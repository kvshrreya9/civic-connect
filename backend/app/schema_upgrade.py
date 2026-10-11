"""Backward-compatible, non-destructive schema upgrade.

db.create_all() creates new tables but never alters existing ones. This module adds any
columns / indexes the models define that an existing database is missing (ALTER TABLE ... ADD
COLUMN), then applies idempotent data migrations. Nothing is ever dropped or truncated.
"""
import logging

from sqlalchemy import inspect, text

from .extensions import db

logger = logging.getLogger(__name__)


def _default_sql(column):
    default = column.default
    if default is None or not default.is_scalar:
        return None
    value = default.arg
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, str):
        return "'" + value.replace("'", "''") + "'"
    return None


def upgrade_schema():
    engine = db.engine
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    added = []
    with engine.begin() as conn:
        for table in db.metadata.sorted_tables:
            if table.name not in existing_tables:
                continue
            present = {c["name"] for c in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in present:
                    continue
                col_type = column.type.compile(dialect=engine.dialect)
                default = _default_sql(column)
                ddl = f'ALTER TABLE {table.name} ADD COLUMN {column.name} {col_type}'
                if default is not None:
                    ddl += f" DEFAULT {default}"
                conn.execute(text(ddl))
                added.append(f"{table.name}.{column.name}")
    # Create any indexes (including unique indexes on new columns) that are missing.
    for table in db.metadata.sorted_tables:
        for index in table.indexes:
            try:
                index.create(bind=engine, checkfirst=True)
            except Exception as exc:  # e.g. legacy duplicates block a unique index
                logger.warning("Could not create index %s: %s", index.name, exc)
    _migrate_data()
    if added:
        logger.info("Schema upgraded, columns added: %s", ", ".join(added))
    return added


def _migrate_data():
    """Idempotent value migrations for the new lifecycle."""
    with db.engine.begin() as conn:
        # Old "resolved" (awaiting citizen verification) maps to "resolution_submitted".
        conn.execute(text("UPDATE complaints SET status = 'resolution_submitted' WHERE status = 'resolved'"))
        conn.execute(text("UPDATE complaints SET related_count = 0 WHERE related_count IS NULL"))
        conn.execute(text("UPDATE complaints SET report_count = 1 WHERE report_count IS NULL"))
