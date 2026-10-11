# API contract

Base URL: `/api`. JSON unless noted. Authenticated endpoints need `Authorization: Bearer <token>`.
Errors: `{"error": "message", "errors": {"field": "message"}}` with an appropriate HTTP status.

## Auth

| Method | Path | Auth | Body / notes | Response |
| --- | --- | --- | --- | --- |
| POST | `/auth/register` | - | `{name, email, password, phone?}` - always creates a citizen | `201 {access_token, user}` |
| POST | `/auth/login` | - | Citizen portal. `{email, password}`; staff accounts are refused (403). 5 failures lock the email for 15 min | `{access_token, user}` |
| POST | `/auth/municipal/login` | - | Municipal portal. `{email, password}`; citizen accounts are refused (403) | `{access_token, user}` |
| POST | `/auth/logout` | any | Client discards the JWT | `{ok}` |
| GET | `/auth/me` | any | | `{user}` |
| PUT | `/auth/me` | any | `{name?, phone?}` | `{user}` |

## Complaints

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/complaints` | citizen | multipart: `title, description, category, severity, safety_risk, affected_count, latitude, longitude, address?, images[] (≤5)`. Header `Idempotency-Key` (or field `client_request_id`, 8-64 chars `[A-Za-z0-9_-]`). `201 {complaint, duplicates[], idempotent_replay:false}`; a replayed key returns `200` with the original complaint and `idempotent_replay:true`. |
| GET | `/complaints` | any | `scope=mine|public|department`, `status` (comma list), `category`, `severity`, `q`, `page`, `per_page` → `{items, total, page, pages}` |
| GET | `/complaints/map` | public | `status`, `category`, `limit` → `{points[]}` (no personal data) |
| GET | `/complaints/{id}` | any | Owner / authorised staff get full detail incl. `resolution` (photos, description, completion time, department, verification status). Other citizens get `visibility: "public"` without photos, evidence or history. Staff outside the jurisdiction get 404 |
| GET | `/complaints/{id}/history` | any | internal notes only for staff |
| POST | `/complaints/{id}/support` | citizen | toggles support → `{supported, support_count, priority_score}` |

Categories: `pothole, road_damage, garbage, water_leakage, drainage, streetlight, tree_hazard, other`.
Severities: `low, medium, high, critical`.

## Location

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/location/reverse?lat=&lng=` | `{address, display_name, source: nominatim|coordinates}` |
| GET | `/location/search?q=` | `{results:[{display_name, latitude, longitude}]}` |
| GET | `/location/nearby?lat=&lng=&radius=&category=` | `{items:[...summary, distance_m]}` |

## Duplicates

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/duplicates/check` | any | `{latitude, longitude, category, description, image_hashes?}` → `{candidates:[{complaint, score, distance_m, text_similarity, image_similarity}]}` |
| GET | `/duplicates/complaint/{id}` | staff or owner | stored candidates |
| POST | `/duplicates/{candidateId}/resolve` | managing staff | `{action: confirm|reject}` |

## Priority

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/priority/{id}` | any | `{score, breakdown}` |
| POST | `/priority/preview` | public | `{severity, category, safety_risk, affected_count, latitude?, longitude?}` |
| POST | `/priority/recalculate` | staff | recalculates all open complaints |

## Municipal (officers, field workers, admins)

All endpoints are restricted to the caller's jurisdiction (office / ward) or, for field workers, their assignments.

| Method | Path | Roles | Notes |
| --- | --- | --- | --- |
| GET | `/municipal/summary` | staff | total, new, unassigned, high_risk, critical, in_progress, resolved, awaiting_verification, overdue, avg_resolution_hours, alerts_unacknowledged, unrouted (admin) |
| GET | `/municipal/complaints` | staff | Sorting/filtering - see `docs/municipal-operations.md`. Returns `{items, total, page, per_page, pages, sort, reference_point}` |
| GET | `/municipal/sort-options` | staff | Allowed sort fields |
| GET | `/municipal/complaints/{id}` | staff | Full detail incl. history, `can_manage`, `can_work` |
| GET | `/municipal/complaints/{id}/activity` | staff | `{assignments, audit}` |
| POST | `/municipal/complaints/{id}/status` | staff | `{status, note?, is_internal?}`; transitions validated per role |
| POST | `/municipal/complaints/{id}/assign` | officer, admin | `{worker_id, note?, deadline?}` (worker must be in the complaint's office) |
| POST | `/municipal/complaints/{id}/transfer` | officer, admin | `{office_id, ward_id?, note?}` - audited, new office notified, alerts move |
| POST | `/municipal/complaints/{id}/notes` | staff | Internal note |
| GET | `/municipal/workers` | officer, admin | Field workers with open-assignment counts |
| GET | `/municipal/wards`, `/municipal/offices` | staff | Lookup lists |
| GET | `/municipal/alerts` | officer, admin | Filters `risk, status (open/acknowledged), ward_id, complaint_status, date_from, date_to, page` |
| GET | `/municipal/alerts/count` | officer, admin | `{unacknowledged}` |
| POST | `/municipal/alerts/{id}/acknowledge` | officer, admin | `{note?}` |
| POST | `/municipal/alerts/{id}/actions` | officer, admin | `{note}` |

## Administration (admin only)

| Method | Path | Notes |
| --- | --- | --- |
| GET/POST | `/admin/offices` | Create: `{name, code, office_type, latitude, longitude, address?, contact_email?, critical_response_minutes?, high_response_minutes?}` |
| PUT | `/admin/offices/{id}` | Partial update, incl. `is_active` |
| GET/POST | `/admin/wards` | Create: `{office_id, name, code, boundary_type: circle|polygon, center_lat, center_lng, radius_m}` or `{..., polygon: [[lat,lng],...]}` |
| PUT | `/admin/wards/{id}` | Partial update |
| GET | `/admin/routing/test?lat=&lng=` | Which office/ward a point routes to |
| POST | `/admin/routing/reroute-unmapped` | Re-run routing for unmapped complaints |
| GET/POST | `/admin/staff` | Create: `{name, email, role: officer|field_worker|admin, office_id, ward_id?, phone?, password}` |
| PUT | `/admin/staff/{id}` | `{name?, role?, office_id?, ward_id?, is_active?, password?}` |
| POST | `/admin/complaints/{id}/route` | Manually route an unmapped complaint `{office_id, ward_id?, note?}` |
| GET | `/admin/audit` | Paginated audit log, `action` prefix filter |

## Employee (legacy, delegates to the municipal services)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/employee/queue` | filters `status, category, severity, sla (on_track|at_risk|overdue), assigned (me|unassigned), escalated, q, sort (priority|sla|newest|oldest), page, per_page, department_id (admin)` |
| GET | `/employee/staff?department_id=` | staff with open assignment counts |
| POST | `/employee/complaints/{id}/status` | `{status, note?, is_internal?}` - transitions validated server-side; rejection needs a 10+ char note |
| POST | `/employee/complaints/{id}/assign` | `{assigned_to_id?, department_id?, note?}` |
| POST | `/employee/complaints/{id}/notes` | `{note}` - internal only |
| GET | `/employee/complaints/{id}/assignments` | routing/assignment audit trail |

## Departments

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/departments` | public | |
| GET | `/departments/routing-rules` | public | `{rules: {category: department}}` |
| GET | `/departments/{id}` | public | |
| PUT | `/departments/{id}` | admin | `{categories?, sla_hours?, description?, contact_email?, is_active?}` |

## Dashboards

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/dashboard/public` | public | `totals, by_status, by_severity, by_category, departments, timeline (30 days), hotspots, recent_resolved` |
| GET | `/dashboard/citizen` | any | own counts, recent reports, reports awaiting confirmation |
| GET | `/dashboard/employee` | staff | department queue counters |

## Images

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/images/{path}?t=<token>` | signed | Only server-generated names under `report/` or `resolution/`; the token is a short-lived signature issued only to the reporting citizen and authorised staff |
| POST | `/images/validate` | any | multipart `image` → `{valid, width, height, original_size, hash, faces_blurred}` |

## Verification

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/verification/{id}` | any | `{before, after, proofs, feedback, can_submit_feedback, can_submit_proof}` |
| POST | `/verification/{id}/proof` | assigned field worker or managing officer | multipart `description` (10+ chars), `images[]` (1 required, ≤5), `completed_at?`, `completion_lat?`, `completion_lng?`; header `Idempotency-Key` → status `resolution_submitted` (replay returns 200) |
| POST | `/verification/{id}/feedback` | reporting citizen | `{verdict: confirmed|disputed, rating?, comment?}` - dispute needs a comment |

## Notifications

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/notifications` | `{items, unread}`; `?unread=true` for unread only. Items include `complaint_reference` |
| POST | `/notifications/{id}/read` | |
| POST | `/notifications/read-all` | |

## Health

`GET /api/health` → `{"status": "ok"}`
