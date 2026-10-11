# Department routing

> Complaints are routed on two axes: **location → responsible office** (municipality / panchayat, see `municipal-operations.md`) and **category → functional department** (this document).

Every new complaint is routed by category to the first active department whose `categories` list contains it. If none matches, it goes to the department with code `GEN` (General Administration), and if that is missing, to the first active department.

## Default rules

| Category | Department | Code |
| --- | --- | --- |
| pothole, road_damage | Roads & Infrastructure | RDS |
| garbage | Solid Waste Management | SWM |
| water_leakage | Water Supply | WTR |
| drainage | Stormwater & Drainage | DRN |
| streetlight | Electrical & Street Lighting | ELC |
| tree_hazard | Parks & Urban Forestry | PRK |
| other | General Administration | GEN |

Defaults live in `backend/app/services/department_routing_service.py` (`DEFAULT_DEPARTMENTS`) and `database/departments.sql`. Missing departments are inserted at start-up; existing ones are never overwritten.

## Changing the rules

- **API (admin):** `PUT /api/departments/{id}` with `{"categories": ["pothole", "road_damage"]}`.
- **SQL:** `UPDATE departments SET categories = '["drainage","water_leakage"]' WHERE code = 'DRN';`

Changes apply to new complaints immediately. Existing complaints keep their department.

## Manual transfer

Staff can transfer a complaint to another department from the complaint page (`POST /api/employee/complaints/{id}/assign` with `department_id`). The assignee is cleared, the new department's staff are notified, and the transfer is recorded in `department_assignments` and as an internal history entry.

## SLA targets

`target_hours = base_hours(category) × multiplier(severity)` (minimum 4 h)

| Category | Base hours |
| --- | --- |
| garbage, water_leakage | 24 |
| drainage, tree_hazard | 48 |
| pothole, streetlight | 72 |
| other | 96 |
| road_damage | 120 |

| Severity | Multiplier |
| --- | --- |
| critical | 0.5 |
| high | 0.75 |
| medium | 1.0 |
| low | 1.5 |

States: `on_track`, `at_risk` (75% of the time used), `overdue`, then after resolution `met` or `breached`. Overdue open complaints are escalated automatically: flagged, given an internal history entry, the citizen and department are notified, and the priority is recalculated.
