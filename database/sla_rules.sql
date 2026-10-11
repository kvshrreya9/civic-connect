-- SLA reference data and a reporting view.
-- The application computes SLA targets in backend/app/services/sla_service.py:
--   target_hours = category_base_hours * severity_multiplier  (minimum 4 h)
-- This file mirrors those rules as a lookup table + view so you can query SLA state in SQL.
-- Idempotent and non-destructive.

CREATE TABLE IF NOT EXISTS sla_rules (
    category VARCHAR(40) PRIMARY KEY,
    base_hours INTEGER NOT NULL
);

INSERT INTO sla_rules (category, base_hours) VALUES
('pothole', 72),
('road_damage', 120),
('garbage', 24),
('water_leakage', 24),
('drainage', 48),
('streetlight', 72),
('tree_hazard', 48),
('other', 96)
ON CONFLICT (category) DO NOTHING;

CREATE TABLE IF NOT EXISTS sla_severity_multipliers (
    severity VARCHAR(20) PRIMARY KEY,
    multiplier NUMERIC(4, 2) NOT NULL
);

INSERT INTO sla_severity_multipliers (severity, multiplier) VALUES
('critical', 0.50),
('high', 0.75),
('medium', 1.00),
('low', 1.50)
ON CONFLICT (severity) DO NOTHING;

CREATE OR REPLACE VIEW v_complaint_sla AS
SELECT
    c.id,
    c.reference,
    c.category,
    c.severity,
    c.status,
    c.risk_level,
    d.name AS department,
    o.name AS office,
    c.created_at,
    c.sla_due_at,
    c.resolved_at,
    CASE
        WHEN c.status = 'rejected' THEN 'closed'
        WHEN c.status IN ('resolution_submitted', 'verified', 'closed') AND c.resolved_at IS NOT NULL
            THEN CASE WHEN c.resolved_at <= c.sla_due_at THEN 'met' ELSE 'breached' END
        WHEN c.sla_due_at < (NOW() AT TIME ZONE 'UTC') THEN 'overdue'
        WHEN EXTRACT(EPOCH FROM ((NOW() AT TIME ZONE 'UTC') - c.created_at))
             >= 0.75 * EXTRACT(EPOCH FROM (c.sla_due_at - c.created_at)) THEN 'at_risk'
        ELSE 'on_track'
    END AS sla_state,
    ROUND(EXTRACT(EPOCH FROM (c.sla_due_at - (NOW() AT TIME ZONE 'UTC'))) / 3600.0, 1) AS hours_remaining
FROM complaints c
LEFT JOIN departments d ON d.id = c.department_id
LEFT JOIN offices o ON o.id = c.office_id;
