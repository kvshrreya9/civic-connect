# Risk classification and high-risk alerts

## Risk level (rule-based, not machine learning)

Risk is a separate, explainable classification. It is **not** the 0-100 priority score, and sorting never changes it.

| Factor | Points |
| --- | --- |
| Severity | low 0 · medium 1 · high 2 · critical 3 |
| Immediate safety risk reported | +2 |
| Affected citizens ≥ `RISK_AFFECTED_THRESHOLD` (default 50) | +1 |
| Related nearby reports ≥ `RISK_RELATED_THRESHOLD` (default 3) | +1 |
| Open and past its resolution deadline | +1 |

| Level | Points (defaults, configurable in `backend/.env`) |
| --- | --- |
| Critical | ≥ `RISK_CRITICAL_POINTS` = 5 |
| High | ≥ `RISK_HIGH_POINTS` = 3 |
| Medium | ≥ `RISK_MEDIUM_POINTS` = 2 |
| Low | below that |

Implemented in `backend/app/services/risk_service.py`. The full breakdown is stored on each complaint (`risk_breakdown`) and shown to staff on the complaint page.

Risk is re-evaluated when a complaint is created, when nearby related reports arrive, on status changes, on citizen feedback, and by the periodic sync (`flask sla-check`, or automatically every `PERIODIC_SYNC_MINUTES` while the API serves requests).

## Alerts

Whenever an **open** complaint is High or Critical, the backend (never the browser):

1. Uses the complaint's `office_id` (from jurisdiction routing) to find the responsible office. Unmapped complaints alert administrators instead.
2. Creates a persistent row in `risk_alerts` with a unique `dedupe_key` (`complaint:<id>:<kind>:<level>`), so refreshes, retries and repeated evaluations never create a second alert.
3. Creates in-app notifications for the office's officers, also de-duplicated (`notifications.dedupe_key`).
4. Sets `response_due_at` from the office's `critical_response_minutes` / `high_response_minutes`.
5. Writes an `alert.created` audit log entry.

Alert kinds: `high_risk`, `critical`, and `escalation` (created when a complaint goes from High to Critical).

If an authorised user transfers the complaint to another office, open alerts move with it and the new office's officers are notified.

## Acknowledgement and actions

On **High-risk alerts** (`/municipality/alerts`) officers can filter by risk, acknowledgement, ward, complaint status and date, then:

- **Acknowledge** - records who acknowledged and when (`acknowledged_by_id`, `acknowledged_at`, optional note).
- **Record action** - appends an `alert.action` audit entry, shown as the alert's action history.
- **Assign responsibility** - opens the complaint's assignment panel.

Unacknowledged alerts are highlighted and counted in the sidebar badge; alerts past `response_due_at` are flagged "Response overdue".

## Optional email / SMS

Configure `SMTP_*` and/or `SMS_WEBHOOK_URL` in `backend/.env`. Messages are sent **after** the database transaction commits. The result is written to the audit log as `disabled`, `accepted` or `failed`. `accepted` means the SMTP server or SMS webhook accepted the message; CivicConnect does not claim delivery.
