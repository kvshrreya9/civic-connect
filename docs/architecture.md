# Architecture

## Overview

```
 Browser (React SPA, PWA)                         Flask API                         PostgreSQL
 ┌──────────────────────────┐   /api (JSON,     ┌──────────────────────────┐      ┌────────────┐
 │ pages / components       │   multipart)      │ routes (blueprints)      │      │ users      │
 │ services (axios)  ───────┼──────────────────▶│   ↓                      │ ORM  │ complaints │
 │ AuthContext / hooks      │                   │ services (business)  ────┼─────▶│ history    │
 │ offline: IndexedDB queue │◀──────────────────┤   ↓                      │      │ images ... │
 │ workers: image compress  │                   │ utils (validation, auth, │      └────────────┘
 │ sw.js: shell + API cache │                   │ idempotency, images)     │      uploads/ (JPEG)
 └──────────────────────────┘                   └──────────────────────────┘
          │  tiles                                     │ reverse geocode (optional)
          ▼                                            ▼
   OpenStreetMap tiles                         OpenStreetMap Nominatim
```

## Backend layers

- **routes/** - thin Flask blueprints: parse the request, check the role, call a service, serialise the result.
- **services/** - all business rules: complaint lifecycle, routing, priority, SLA, duplicates, verification, dashboards, notifications, images.
- **models/** - SQLAlchemy models. `to_dict(viewer=...)` hides reporter identity and internal notes from people who should not see them.
- **utils/** - validation (`ApiError`), permissions decorators, idempotency key handling, image helpers, security helpers.
- **tasks/** - periodic SLA/priority sync (piggybacks on requests, at most every `PERIODIC_SYNC_MINUTES`) and CLI commands.

Errors are raised as `ApiError(message, status, errors)` and rendered by one handler as `{"error": "...", "errors": {field: msg}}`.

## Municipal upgrade

Offices, wards, field workers, risk alerts and audit logs extend this architecture. See `municipal-operations.md` and `risk-and-alerts.md`. New service modules: `jurisdiction_service`, `risk_service`, `alert_service`, `municipal_query_service`, `admin_service`, `audit_service`, `external_notifier`, `after_commit`. New routes: `municipal_routes.py`, `admin_routes.py`.

## Complaint lifecycle

```
submitted -> reviewed -> assigned -> in_progress -> resolution_submitted -> verified -> closed
     \            \          \           \           (evidence upload)    |  (citizen)  (officer)
      \-----------\----------\-----------\--> rejected                     \--> reopened (citizen dispute)
```

`resolution_submitted` can only be reached by uploading resolution photos; `verified` and `reopened` only by the reporting citizen; `closed` by an officer after verification.

## Frontend structure

- `routes/AppRouter.jsx` - public shell; `/citizen/*` (citizens), `/municipality/*` (staff) and `/admin` (administrators) protected by role. Legacy `/employee/*` URLs redirect.
- `services/*.js` - one module per API area; `api.js` holds the axios instance, auth header and error helpers.
- `offline/` - IndexedDB wrapper, draft + queue store, sync manager with backoff.
- `workers/imageWorker.js` - OffscreenCanvas compression off the main thread.
- `sw.js` - served at `/sw.js` by a small Vite plugin; caches the app shell, static assets, public stats and images.

## Roles

| Role | Can |
| --- | --- |
| citizen | report, support others' reports, track own reports, confirm/dispute fixes |
| officer (legacy: employee) | manage complaints in their office / ward: review, assign, transfer, notes, status, alerts |
| field_worker | work on complaints assigned to them and upload resolution evidence |
| admin | everything employees can, across all departments; edit routing rules and SLA hours |

Public registration always creates citizens. Staff accounts are created by an administrator in `/admin` (the first admin via `flask create-admin`). Staff sign in at `/municipality/login`.
