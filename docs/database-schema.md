# Database schema

Source of truth: `backend/app/models/`. `database/schema.sql` is generated from those models.

| Table | Purpose | Key columns |
| --- | --- | --- |
| `departments` | Responsible authorities and routing rules | `code` (unique), `categories` JSON list, `sla_hours`, `is_active` |
| `users` | Citizens, officers, field workers, admins (legacy `employee` = officer) | `email` (unique), `password_hash` (Werkzeug scrypt/pbkdf2), `role`, `department_id` |
| `complaints` | Reported issues | `reference` (unique, e.g. `CC-2026-4F9A1C`), `category`, `severity`, `safety_risk`, `affected_count`, `latitude`, `longitude`, `address`, `status`, `priority_score`, `priority_breakdown` JSON, `citizen_id`, `department_id`, `assigned_to_id`, `sla_due_at`, `escalated`, `support_count`, `possible_duplicate`, `duplicate_of_id`, `client_request_id` (unique, idempotency), timestamps |
| `complaint_status_history` | Audit trail and staff notes | `from_status`, `to_status`, `note`, `is_internal`, `changed_by_id` |
| `complaint_images` | Stored photos (before and after) | `kind` (`report`/`resolution`), `filename` (random), `phash` (64-bit dHash hex), `width`, `height`, `size_bytes`, `faces_blurred`, `proof_id` |
| `resolution_proofs` | Staff work reports | `complaint_id`, `employee_id`, `notes` |
| `resolution_feedback` | Citizen confirmation or dispute | `verdict`, `rating` 1-5, `comment` |
| `department_assignments` | Routing / assignment / transfer log | `department_id`, `assigned_to_id`, `assigned_by_id`, `reason` (`auto_routing`/`manual`/`transfer`) |
| `duplicate_candidates` | Possible duplicate pairs | `complaint_id`, `candidate_id`, `score`, `distance_m`, `text_similarity`, `image_similarity`, `status` |
| `complaint_supports` | Citizen upvotes | unique (`complaint_id`, `user_id`) |
| `notifications` | In-app notifications | `user_id`, `complaint_id`, `title`, `message`, `type`, `is_read`, `dedupe_key` (unique, idempotency) |
| `offices` | Municipalities / panchayats | `code` (unique), `office_type`, `latitude`, `longitude`, `critical_response_minutes`, `high_response_minutes`, `is_active` |
| `wards` | Jurisdiction boundaries mapped to an office | `office_id`, `code`, `boundary_type` (circle/polygon), `center_lat`, `center_lng`, `radius_m`, `polygon` JSON, `match_priority` |
| `risk_alerts` | Persistent High/Critical alerts | `complaint_id`, `office_id`, `risk_level`, `kind`, `dedupe_key` (unique), `status`, `response_due_at`, `acknowledged_by_id`, `acknowledged_at` |
| `audit_logs` | Append-only action log | `actor_id`, `action`, `entity_type`, `entity_id`, `complaint_id`, `details` JSON |

### Columns added by the municipal upgrade

Added to existing tables by `backend/app/schema_upgrade.py` (non-destructive `ALTER TABLE ... ADD COLUMN`):

- `users`: `office_id`, `ward_id`, `created_by_id`
- `complaints`: `office_id`, `ward_id`, `routing_status`, `risk_level`, `risk_breakdown`, `related_count`, `report_count`, `reviewed_at`, `closed_at`
- `department_assignments`: `office_id`
- `notifications`: `dedupe_key`
- `resolution_proofs`: `completed_at`, `completion_lat`, `completion_lng`, `client_request_id`

Data migration: complaint status `resolved` becomes `resolution_submitted` (same meaning: awaiting citizen verification).

Optional objects from `database/sla_rules.sql`: `sla_rules`, `sla_severity_multipliers` and the `v_complaint_sla` view.

## Relationships

```
departments 1─* users (staff)
departments 1─* complaints
users 1─* complaints (citizen_id)          users 1─* complaints (assigned_to_id)
complaints 1─* complaint_status_history    complaints 1─* complaint_images
complaints 1─* resolution_proofs 1─* complaint_images (proof_id)
complaints 1─* resolution_feedback         complaints 1─* department_assignments
complaints 1─* duplicate_candidates (both complaint_id and candidate_id)
complaints 1─* complaint_supports          users 1─* notifications
```

Timestamps are stored as naive UTC and serialised with a trailing `Z`.
