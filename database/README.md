# Database

CivicConnect uses your existing PostgreSQL database named `civicconnect`. Nothing in this folder drops or recreates it.

## Option A - let the app manage tables (recommended)

With `AUTO_CREATE_TABLES=true` (default) the backend creates any missing tables, **adds any missing columns to existing tables** (non-destructive upgrade) and inserts the default departments on start-up. You can also run it explicitly:

```bash
cd backend
flask init-db
flask seed-demo   # optional demo data
```

## Option B - run the SQL files manually

```bash
psql -U <your_user> -d civicconnect -f database/schema.sql
psql -U <your_user> -d civicconnect -f database/departments.sql
psql -U <your_user> -d civicconnect -f database/sla_rules.sql
psql -U <your_user> -d civicconnect -f database/seed.sql      # optional, demo only
```

All statements are idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, `WHERE NOT EXISTS`).

| File | Contents |
| --- | --- |
| `schema.sql` | All tables and indexes, generated from the SQLAlchemy models so the two never drift. Optional PostGIS spatial index. |
| `departments.sql` | Seven default departments and their category routing rules. |
| `sla_rules.sql` | SLA reference tables mirroring `sla_service.py`, plus the `v_complaint_sla` reporting view. |
| `seed.sql` | Demo offices, wards and staff/citizen accounts (password `CivicDemo@2026`). **No complaints**, so all statistics start at 0. Same as `flask seed-demo`. |

## PostGIS

PostGIS is optional. Proximity queries use a bounding-box filter in SQL and an exact haversine distance in Python, which works on any PostgreSQL. If PostGIS is installed, `schema.sql` adds a GiST geography index for future spatial queries.

## Migrations

Flask-Migrate is configured. To start tracking schema changes on an existing database:

```bash
cd backend
flask db init
flask db migrate -m "baseline"
flask db stamp head
```
