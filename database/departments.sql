-- Default departments and their category routing rules.
-- Idempotent: existing departments (matched by code) are left untouched.
--   psql -U <your_user> -d civicconnect -f database/departments.sql

INSERT INTO departments (name, code, description, categories, sla_hours, contact_email, is_active, created_at) VALUES
('Roads & Infrastructure', 'RDS', 'Road surfaces, potholes, footpaths and bridges.', '["pothole", "road_damage"]', 96, 'roads@civicconnect.demo', TRUE, NOW()),
('Solid Waste Management', 'SWM', 'Garbage collection, dumping and street cleaning.', '["garbage"]', 24, 'waste@civicconnect.demo', TRUE, NOW()),
('Water Supply', 'WTR', 'Pipeline leaks, bursts and supply disruptions.', '["water_leakage"]', 24, 'water@civicconnect.demo', TRUE, NOW()),
('Stormwater & Drainage', 'DRN', 'Blocked drains, overflow and waterlogging.', '["drainage"]', 48, 'drainage@civicconnect.demo', TRUE, NOW()),
('Electrical & Street Lighting', 'ELC', 'Streetlights, exposed wiring and poles.', '["streetlight"]', 72, 'lighting@civicconnect.demo', TRUE, NOW()),
('Parks & Urban Forestry', 'PRK', 'Fallen or dangerous trees, parks upkeep.', '["tree_hazard"]', 48, 'parks@civicconnect.demo', TRUE, NOW()),
('General Administration', 'GEN', 'Issues that need triage by the city office.', '["other"]', 96, 'general@civicconnect.demo', TRUE, NOW())
ON CONFLICT (code) DO NOTHING;
