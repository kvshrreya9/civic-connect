-- Safe demo configuration for the existing civicconnect database. Non-destructive and idempotent.
-- Creates demo OFFICES, WARDS and STAFF ACCOUNTS only - no complaints - so all statistics start at 0.
-- Run after schema.sql and departments.sql (or after starting the API once):
--   psql -U <your_user> -d civicconnect -f database/seed.sql
--
-- Demo password for every account below: CivicDemo@2026  (demo only - change it for any real deployment)
-- Ward boundaries are illustrative circles around Chennai (13.0827, 80.2707). Replace them with your real
-- jurisdiction boundaries in Administration -> Wards. Equivalent: cd backend && flask seed-demo

INSERT INTO offices (name, code, office_type, latitude, longitude, address, critical_response_minutes, high_response_minutes, is_active, created_at) VALUES
('Central City Municipality', 'CCM', 'municipality', 13.0827, 80.2707, 'Central City Municipality office (demo location)', 60, 240, TRUE, NOW()),
('North Gram Panchayat', 'NGP', 'panchayat', 13.1427, 80.2607, 'North Gram Panchayat office (demo location)', 60, 240, TRUE, NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO wards (office_id, name, code, boundary_type, center_lat, center_lng, radius_m, match_priority, is_active, created_at)
SELECT o.id, v.name, v.code, 'circle', v.lat, v.lng, v.radius, 0, TRUE, NOW()
FROM (VALUES
    ('CCM', 'Ward 1 - Central', 'W01', 13.0827, 80.2707, 2500.0),
    ('CCM', 'Ward 2 - East', 'W02', 13.0867, 80.3057, 2000.0),
    ('NGP', 'North Village', 'NV1', 13.1427, 80.2607, 3000.0)
) AS v(office_code, name, code, lat, lng, radius)
JOIN offices o ON o.code = v.office_code
WHERE NOT EXISTS (SELECT 1 FROM wards w WHERE w.office_id = o.id AND w.code = v.code);

INSERT INTO users (name, email, password_hash, role, office_id, is_active, created_at)
SELECT v.name, v.email, 'pbkdf2:sha256:1000000$UDuCFV2bhs2ZjArW$70619ee58a3988a054f1261c696a65a802f888a688d1a0e663de8a167db7590d', v.role, o.id, TRUE, NOW()
FROM (VALUES
    ('City Administrator', 'admin@civicconnect.demo', 'admin', NULL),
    ('Central Municipality Officer', 'officer.ccm@civicconnect.demo', 'officer', 'CCM'),
    ('Central Field Worker', 'worker.ccm@civicconnect.demo', 'field_worker', 'CCM'),
    ('North Panchayat Officer', 'officer.ngp@civicconnect.demo', 'officer', 'NGP'),
    ('North Field Worker', 'worker.ngp@civicconnect.demo', 'field_worker', 'NGP'),
    ('Asha Raman', 'asha@civicconnect.demo', 'citizen', NULL)
) AS v(name, email, role, office_code)
LEFT JOIN offices o ON o.code = v.office_code
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.email = v.email);
