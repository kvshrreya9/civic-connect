# Municipal operations: jurisdiction routing, sorting and the resolution workflow

## Roles

| Role | Login | Can |
| --- | --- | --- |
| Citizen | `/login` | Report, support, track own complaints, see resolution photos, confirm or dispute |
| Officer (`officer`; legacy `employee`) | `/municipality/login` | Everything in their office (and ward, if ward-scoped): review, assign, transfer, notes, status, alerts |
| Field worker (`field_worker`) | `/municipality/login` | Only complaints assigned to them: start work, internal notes, upload resolution evidence |
| Administrator (`admin`) | `/municipality/login` | All offices, the unassigned queue, offices / wards / staff management, audit log |

Staff accounts are created only by administrators (`/admin` → Staff accounts, or `POST /api/admin/staff`). The first administrator is created with `flask create-admin`. Citizen self-registration can never create staff. Each portal rejects the other kind of account. All checks are enforced in the API (`backend/app/utils/permissions.py`), not just in the React routes.

## Jurisdiction routing

```
Citizen submits -> point tested against active wards -> ward's office becomes responsible
               -> complaint appears in that office's dashboard -> officer assigns a field worker
```

- Wards are **circles** (centre + radius) or **polygons** (`[[lat, lng], ...]`), configured by administrators.
- When wards overlap, the highest `match_priority` wins, then the smallest circle.
- If no configured ward contains the point, `routing_status = unmapped` and the complaint goes to the **unassigned administrative queue** (`/admin?tab=unrouted`). It is never sent to an arbitrary office.
- Administrators can route it manually, or add a ward and press **Re-run location routing** (`flask reroute-unmapped`).
- Officers can transfer a complaint to another office; every transfer is in `department_assignments` and `audit_logs`, and the new office is notified.
- Category-based department routing (Roads, Water, ...) still applies in parallel and identifies the functional department.

Automatic routing is only as accurate as the boundaries you configure. The demo wards from `flask seed-demo` are illustrative circles.

## Lifecycle

`Submitted → Reviewed → Assigned → In Progress → Resolution Submitted → Verified → Closed`, plus `Reopened` (citizen dispute) and `Rejected`.

| From | Officer may move to | Field worker may move to |
| --- | --- | --- |
| submitted | reviewed, rejected (assigned via *Assign*) | - |
| reviewed | in_progress, rejected (assigned via *Assign*) | - |
| assigned | in_progress, reviewed, rejected | in_progress |
| in_progress | assigned (if a worker is set), rejected | - |
| reopened | reviewed, in_progress, rejected (assigned via *Assign*) | in_progress |
| resolution_submitted | in_progress (send back) | - |
| verified | closed | - |
| rejected | reviewed | - |

`resolution_submitted` is reachable only by uploading evidence; `verified` / `reopened` only by the reporting citizen. Every change records previous status, new status, user, timestamp and remarks in `complaint_status_history` and `audit_logs`.

## Resolution evidence

The assigned field worker (or a managing officer) submits: description, completion time, optional completion coordinates, one required resolution photo and up to four more. Photos are validated, EXIF-stripped, resized and stored under `uploads/resolution/` (citizen photos are under `uploads/report/`). The request carries an `Idempotency-Key`, so a double tap returns the original record. The complaint becomes `resolution_submitted` and the citizen is notified.

The citizen sees the real photo in the **Resolution Photo** column of *My reports* ("Awaiting Resolution Photo" until then), with description, completion time, department and verification status, and can confirm or dispute. A dispute reopens the complaint, escalates it, notifies the office and the worker, and preserves all earlier evidence and history.

Images are served only through short-lived signed URLs that the API issues to the reporting citizen and authorised staff.

Administrators receive in-app notifications for critical alerts across all offices. The **Critical alert phone** is reserved for optional automated alert integrations. Separately, when a citizen marks a report **High** or **Critical**, they can choose **Call municipality** on the report form; the app resolves the pinned location against configured ward boundaries, shows the responsible office’s public contact number, and opens the device dialer for the citizen to place the call. Configure that public number in **Administration → Offices → Public contact phone**. The `tel:` link opens the phone app when supported by the device/browser; the citizen confirms and places the call. If no boundary or public number is configured, the app does not guess an office or number.

Create a separate officer login for each municipality under **Administration → Staff accounts**, assign it to the matching office, and use an individual email/login and password. The municipal sign-in page now asks staff to select their municipality; credentials assigned to another office are rejected when a different office is selected. Administrators select **Administrator / All offices**. Citizen reports route to the office whose active ward boundary contains the report location. The demo boundaries are illustrative; configure real boundaries for each service area in **Wards & boundaries**, then use **Unassigned queue → Re-run location routing** to route existing unmapped reports. Reports outside all configured boundaries remain visible in the administrator's unassigned queue rather than being assigned to the wrong municipality.

Municipal dashboards distinguish open complaints **Unassigned** from **Open, assigned to staff**, and show the number of active field-worker accounts for the office. These are live counts, not placeholder values.

## Sorting and filtering (`GET /api/municipal/complaints`)

Sorting, filtering and pagination run in the database and are always restricted to the caller's jurisdiction.

`sort` is a comma-separated list of up to 4 `field:direction` rules; `id asc` is always appended as a stable tie-break.

| Field | Meaning |
| --- | --- |
| `risk` | Critical > High > Medium > Low (unrated last when descending) |
| `priority` | 0-100 priority score |
| `reports` | Unique citizens reporting the issue (`report_count`) |
| `related` | Related complaint records nearby (`related_count`) |
| `distance_office` | Distance from the complaint's office coordinates |
| `distance_point` | Distance from `ref_lat` / `ref_lng` (selected on the map, or the officer's location) |
| `created` | Date reported |
| `overdue` | Overdue open complaints first, most overdue first |
| `deadline` | Resolution deadline |

Examples: `risk:desc,reports:desc` · `reports:desc,risk:desc` · `risk:desc,distance_office:asc` · `distance_office:asc,created:asc` · `overdue:desc,priority:desc`.

Filters: `status` (comma list, or `all`), `risk`, `category`, `severity`, `ward_id`, `assigned_to` (`me`, `unassigned` or a user id), `overdue`, `escalated`, `min_reports`, `min_related`, `date_from`, `date_to`, `q`, `page`, `per_page` (≤100); admins also `office_id` and `unrouted`.

Each item includes `distance_from_office_m`, `distance_from_point_m` (exact Haversine), `report_count`, `related_count` and `widespread` (true when `report_count ≥ WIDESPREAD_REPORT_THRESHOLD`).

### Report counting

For each complaint, other complaints of the **same category** within `RELATED_RADIUS_M` (200 m) reported in the last `RELATED_WINDOW_DAYS` (60) and not rejected are **related**. `related_count` counts those records; `report_count` counts **unique citizens** among the complaint and its related complaints, so the same person submitting twice counts once. No original complaint is ever merged or deleted.

### Distance ordering

The ORDER BY uses an equirectangular expression (pure arithmetic, so it works on PostgreSQL and SQLite and is monotonic with true distance at city scale). The displayed distance is exact Haversine. *Nearest to me* asks for browser location only when chosen; if denied, the UI explains and offers the map picker or office distance instead.

In the UI, filters, sort rules, reference point and page are kept in the URL, so they persist across pagination and refreshes.
