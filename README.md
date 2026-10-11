# CivicConnect

**Your City. Your Voice. Real Change.**

CivicConnect is a location-aware civic issue reporting and resolution platform. Citizens report potholes, garbage, leaks, drainage problems, broken streetlights and other infrastructure issues; the report is routed to the responsible department, ranked by a transparent priority score, tracked against a deadline, and only closed once the citizen confirms the fix against before/after photos.

## What's new in the municipal upgrade

- Separate **Municipality / Panchayat staff login** (`/municipality/login`) alongside the citizen login (`/login`); each portal rejects the other kind of account.
- Roles: Citizen, Officer, Field Worker, Administrator - enforced in every API, scoped to the officer's office and (optionally) ward.
- **Location-based routing** to the responsible office using administrator-configured ward boundaries (circles or polygons). Unmatched locations go to an unassigned admin queue - never to an arbitrary office.
- **Municipal dashboard** with database-derived counts (total, new, unassigned, high-risk, critical, in progress, resolved, overdue, average resolution time).
- **Complaint management table** with ID, issue, original photo, location/ward/map link, risk, priority, report count, distance, date, assignee, status, deadline, resolution photo and actions.
- **Database-level sorting** by risk, priority, number of reports, related reports, distance from office / selected point / your location, overdue status, date - combinable with stable tie-breaks, persisted in the URL across pages.
- Lifecycle `Submitted → Reviewed → Assigned → In Progress → Resolution Submitted → Verified → Closed` with full status and audit history.
- **Field-worker resolution upload** (required photo, description, completion time/location, extra photos, idempotent), stored separately from citizen photos.
- **Resolution Photo column** on the citizen dashboard ("Awaiting Resolution Photo" until uploaded), with confirm / dispute.
- **Rule-based risk levels** and persistent, de-duplicated **High / Critical alerts** to the responsible officers, with escalation, acknowledgement and action tracking (`/municipality/alerts`).
- Persistent, idempotent notifications for citizens and staff; optional SMTP / SMS webhook for alerts.
- **Administration** (`/admin`): offices, wards with a routing tester, staff accounts, the unassigned queue, audit log.
- Photos are served only via short-lived signed URLs to the reporting citizen and authorised staff.
- Fresh installs show **0** for every statistic; demo seeding creates offices, wards and accounts only.

See `docs/municipal-operations.md` and `docs/risk-and-alerts.md`.

## Features

- Citizen registration and JWT login with role-based access (citizen, employee, admin)
- Complaint reporting with category, severity, safety flag, people affected, photos, map pin and auto-suggested address
- Transparent 0-100 priority score (severity, safety, affected citizens, nearby related reports, time unresolved) with a per-factor breakdown
- Duplicate detection by distance, category, text similarity and perceptual image hash - warns, never discards
- Leaflet + OpenStreetMap maps everywhere (no API keys)
- Automatic, configurable department routing by category, with manual transfer
- Citizen dashboard, status history, supports/upvotes and in-app notifications
- Authority dashboard: ranked queue, filters, list/map views, assignment, status updates, internal staff notes
- SLA targets per category and severity, at-risk/overdue indicators, automatic escalation
- Resolution verification: staff must upload after photos; citizen confirms or disputes (dispute reopens and escalates)
- Public transparency dashboard: real statistics, trends, category chart, department performance, hotspots, CSV export
- Offline drafts (IndexedDB), queued submissions, exponential-backoff retries, idempotent submission keys, service worker
- Image validation, on-device compression, EXIF/GPS stripping, optional face blurring (OpenCV), safe storage
- 103 automated backend tests (pytest)

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite 5, Tailwind CSS 3, React Router 6, Axios, Lucide React, Leaflet, React Leaflet |
| Backend | Flask 3, Flask-SQLAlchemy, Flask-JWT-Extended, Flask-CORS, Flask-Migrate, python-dotenv |
| Database | PostgreSQL (`civicconnect`), optional PostGIS index, lat/lng fallback |
| Images | Pillow, OpenCV (optional face blur) |
| Offline | IndexedDB, Service Worker, Web Worker (OffscreenCanvas) |
| Tests | pytest (SQLite in-memory), `vite build` |

## Prerequisites

- Python 3.10+
- Node.js 18+ and npm
- PostgreSQL with an existing database named `civicconnect`

## Setup (Windows PowerShell)

### 1. Backend

```powershell
cd civic-issue-platform\backend
python -m venv venv            # skip if you already have a virtual environment
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

If you do **not** already have `backend\.env`, copy the example and fill in your own values:

```powershell
Copy-Item .env.example .env
python -c "import secrets; print(secrets.token_hex(32))"   # paste into SECRET_KEY, run again for JWT_SECRET_KEY
```

If you already have a `backend\.env`, keep it and just make sure it contains `DATABASE_URL` (or `DB_USER`/`DB_PASSWORD`/`DB_HOST`/`DB_PORT`/`DB_NAME`), `SECRET_KEY` and `JWT_SECRET_KEY`.

Create/upgrade the tables (non-destructive: new tables and columns are added, nothing is dropped), then either create your own administrator or load the demo configuration:

```powershell
flask init-db
flask create-admin          # your own administrator, then add offices/wards/staff in /admin
# or, for a demo:
flask seed-demo             # demo offices, wards and accounts - NO complaints, so all stats are 0
python run.py
```

`flask seed-demo --with-complaints` adds five sample complaints. If you seeded demo complaints with an earlier version and want the site back at 0, run `flask remove-demo-complaints --yes` - it deletes **only** complaints reported by `@civicconnect.demo` accounts.

The API runs at `http://127.0.0.1:5000` (health check: `/api/health`).

### 2. Frontend

```powershell
cd civic-issue-platform\frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` to the backend, so no CORS setup is needed in development.

### macOS / Linux

Same steps; activate the environment with `source venv/bin/activate`.

## Demo accounts

For a local preset setup, `flask seed-demo` creates all 15 Greater Chennai Corporation zone offices, their map boundaries, and officer/field-worker accounts. The default password comes from `DEMO_PASSWORD` in `backend/.env` (default `CivicDemo@2026`). Citizens are not pre-created; they must use the signup flow first.

| Role | Email | Login page |
| --- | --- | --- |
| Administrator | `admin@civicconnect.demo` | `/municipality/login` |
| Zone 1 - Thiruvottiyur officer | `officer.thiruvottiyur@civicconnect.demo` | `/municipality/login` |
| Zone 1 - Thiruvottiyur field worker | `worker.thiruvottiyur@civicconnect.demo` | `/municipality/login` |
| Zone 2 - Manali officer | `officer.manali@civicconnect.demo` | `/municipality/login` |
| Zone 2 - Manali field worker | `worker.manali@civicconnect.demo` | `/municipality/login` |
| Zone 3 - Madhavaram officer | `officer.madhavaram@civicconnect.demo` | `/municipality/login` |
| Zone 3 - Madhavaram field worker | `worker.madhavaram@civicconnect.demo` | `/municipality/login` |
| Zone 4 - Tondiarpet officer | `officer.tondiarpet@civicconnect.demo` | `/municipality/login` |
| Zone 4 - Tondiarpet field worker | `worker.tondiarpet@civicconnect.demo` | `/municipality/login` |
| Zone 5 - Royapuram officer | `officer.royapuram@civicconnect.demo` | `/municipality/login` |
| Zone 5 - Royapuram field worker | `worker.royapuram@civicconnect.demo` | `/municipality/login` |
| Zone 6 - Thiru-Vi-Ka Nagar officer | `officer.thiruvikanagar@civicconnect.demo` | `/municipality/login` |
| Zone 6 - Thiru-Vi-Ka Nagar field worker | `worker.thiruvikanagar@civicconnect.demo` | `/municipality/login` |
| Zone 7 - Ambattur officer | `officer.ambattur@civicconnect.demo` | `/municipality/login` |
| Zone 7 - Ambattur field worker | `worker.ambattur@civicconnect.demo` | `/municipality/login` |
| Zone 8 - Anna Nagar officer | `officer.annanagar@civicconnect.demo` | `/municipality/login` |
| Zone 8 - Anna Nagar field worker | `worker.annanagar@civicconnect.demo` | `/municipality/login` |
| Zone 9 - Teynampet officer | `officer.teynampet@civicconnect.demo` | `/municipality/login` |
| Zone 9 - Teynampet field worker | `worker.teynampet@civicconnect.demo` | `/municipality/login` |
| Zone 10 - Kodambakkam officer | `officer.kodambakkam@civicconnect.demo` | `/municipality/login` |
| Zone 10 - Kodambakkam field worker | `worker.kodambakkam@civicconnect.demo` | `/municipality/login` |
| Zone 11 - Valasaravakkam officer | `officer.valasaravakkam@civicconnect.demo` | `/municipality/login` |
| Zone 11 - Valasaravakkam field worker | `worker.valasaravakkam@civicconnect.demo` | `/municipality/login` |
| Zone 12 - Alandur officer | `officer.alandur@civicconnect.demo` | `/municipality/login` |
| Zone 12 - Alandur field worker | `worker.alandur@civicconnect.demo` | `/municipality/login` |
| Zone 13 - Adyar officer | `officer.adyar@civicconnect.demo` | `/municipality/login` |
| Zone 13 - Adyar field worker | `worker.adyar@civicconnect.demo` | `/municipality/login` |
| Zone 14 - Perungudi officer | `officer.perungudi@civicconnect.demo` | `/municipality/login` |
| Zone 14 - Perungudi field worker | `worker.perungudi@civicconnect.demo` | `/municipality/login` |
| Zone 15 - Sholinganallur officer | `officer.sholinganallur@civicconnect.demo` | `/municipality/login` |
| Zone 15 - Sholinganallur field worker | `worker.sholinganallur@civicconnect.demo` | `/municipality/login` |

Citizen login is intentionally excluded from the default seeded data. Citizens must create their own account via `/signup` and then log in on `/login`.

Reports are routed by their map-pin coordinates against the bundled Greater Chennai Corporation zone polygons. The boundary data is a simplified copy of the GCC zone layer published through [ArcGIS FeatureServer](https://services2.arcgis.com/I9cUOJUZvdGAJncI/arcgis/rest/services/Chennai_GCC_Boundary/FeatureServer/39), with `maxAllowableOffset=0.00005` and `geometryPrecision=6`. Reports outside those polygons remain in the administrator's unassigned queue. Change `DEMO_PASSWORD` before seeding anything publicly reachable.

## Running tests

```powershell
cd backend
python -m pytest -q
cd ..\frontend
npm run build
```

Backend tests use an in-memory SQLite database, so they never touch your PostgreSQL data.

## Useful commands

| Command | Purpose |
| --- | --- |
| `flask init-db` | Create missing tables and default departments |
| `flask create-admin` | Create an administrator (prompts for email, name, password) |
| `flask seed-demo [--with-complaints]` | Demo offices, wards and accounts (complaints only with the flag) |
| `flask remove-demo-complaints --yes` | Delete only complaints reported by demo accounts |
| `flask reroute-unmapped` | Re-run location routing for complaints without an office |
| `flask sla-check` | Escalate overdue complaints, recalculate priority/risk (raising alerts), send deadline warnings |
| `flask recalc-priority` | Recalculate priority for all open complaints |
| `flask images-maintenance [--delete-orphans]` | Backfill image hashes, find/delete unreferenced files |

The SLA check also runs automatically every `PERIODIC_SYNC_MINUTES` while the API is serving requests.

## Project structure

```
civic-issue-platform/
  backend/     Flask API (app/models, app/routes, app/services, app/utils, app/tasks, tests)
  frontend/    React + Vite client (components, pages, services, offline, workers)
  database/    schema.sql, departments.sql, sla_rules.sql, seed.sql
  docs/        architecture, API contract, schema, routing, municipal operations, risk & alerts, duplicates, offline sync, privacy
```

See `docs/` for detailed design documentation.

## Free services used

- Map tiles: OpenStreetMap (attribution shown on every map)
- Geocoding: OpenStreetMap Nominatim (no key; respect the usage policy - set a real contact in `GEOCODER_USER_AGENT`, or set `GEOCODER_ENABLED=false` to work fully offline with coordinate-based addresses)
