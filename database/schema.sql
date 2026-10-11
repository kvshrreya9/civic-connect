-- CivicConnect PostgreSQL schema (generated from the SQLAlchemy models in backend/app/models).
--
-- Safe for your existing "civicconnect" database: every CREATE uses IF NOT EXISTS and nothing is dropped.
-- NOTE: CREATE TABLE IF NOT EXISTS does not add new columns to tables that already exist. For an existing
-- database, prefer `flask init-db` (or simply starting the API), which also runs the non-destructive
-- column upgrade in backend/app/schema_upgrade.py.
--
--   psql -U <your_user> -d civicconnect -f database/schema.sql
--
-- PostGIS is optional. Distances use a lat/lng bounding box + Haversine in the service layer and an
-- arithmetic ordering expression in SQL. If PostGIS is installed, the optional index at the bottom is added.

CREATE TABLE IF NOT EXISTS departments (
	id SERIAL NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	code VARCHAR(20) NOT NULL, 
	description TEXT, 
	categories JSON NOT NULL, 
	sla_hours INTEGER NOT NULL, 
	contact_email VARCHAR(255), 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (name)
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_departments_code ON departments (code);

CREATE TABLE IF NOT EXISTS offices (
	id SERIAL NOT NULL, 
	name VARCHAR(160) NOT NULL, 
	code VARCHAR(30) NOT NULL, 
	office_type VARCHAR(20) NOT NULL, 
	latitude FLOAT, 
	longitude FLOAT, 
	address VARCHAR(500), 
	contact_email VARCHAR(255), 
	contact_phone VARCHAR(32), 
	critical_response_minutes INTEGER NOT NULL, 
	high_response_minutes INTEGER NOT NULL, 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (name)
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_offices_code ON offices (code);

CREATE TABLE IF NOT EXISTS wards (
	id SERIAL NOT NULL, 
	office_id INTEGER NOT NULL, 
	name VARCHAR(160) NOT NULL, 
	code VARCHAR(30) NOT NULL, 
	boundary_type VARCHAR(10) NOT NULL, 
	center_lat FLOAT, 
	center_lng FLOAT, 
	radius_m FLOAT, 
	polygon JSON, 
	match_priority INTEGER NOT NULL, 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_ward_office_code UNIQUE (office_id, code), 
	FOREIGN KEY(office_id) REFERENCES offices (id)
);

CREATE INDEX IF NOT EXISTS ix_wards_office_id ON wards (office_id);

CREATE TABLE IF NOT EXISTS users (
	id SERIAL NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	phone VARCHAR(32), 
	password_hash VARCHAR(255) NOT NULL, 
	role VARCHAR(20) NOT NULL, 
	department_id INTEGER, 
	office_id INTEGER, 
	ward_id INTEGER, 
	created_by_id INTEGER, 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(department_id) REFERENCES departments (id), 
	FOREIGN KEY(office_id) REFERENCES offices (id), 
	FOREIGN KEY(ward_id) REFERENCES wards (id), 
	FOREIGN KEY(created_by_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_users_department_id ON users (department_id);

CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email);

CREATE INDEX IF NOT EXISTS ix_users_office_id ON users (office_id);

CREATE INDEX IF NOT EXISTS ix_users_role ON users (role);

CREATE INDEX IF NOT EXISTS ix_users_ward_id ON users (ward_id);

CREATE TABLE IF NOT EXISTS complaints (
	id SERIAL NOT NULL, 
	reference VARCHAR(32) NOT NULL, 
	title VARCHAR(160) NOT NULL, 
	description TEXT NOT NULL, 
	category VARCHAR(40) NOT NULL, 
	severity VARCHAR(20) NOT NULL, 
	safety_risk BOOLEAN NOT NULL, 
	affected_count INTEGER NOT NULL, 
	latitude FLOAT NOT NULL, 
	longitude FLOAT NOT NULL, 
	address VARCHAR(500), 
	status VARCHAR(24) NOT NULL, 
	priority_score INTEGER NOT NULL, 
	priority_breakdown JSON NOT NULL, 
	risk_level VARCHAR(10), 
	risk_breakdown JSON, 
	related_count INTEGER, 
	report_count INTEGER, 
	citizen_id INTEGER NOT NULL, 
	department_id INTEGER, 
	office_id INTEGER, 
	ward_id INTEGER, 
	routing_status VARCHAR(20), 
	assigned_to_id INTEGER, 
	sla_due_at TIMESTAMP WITHOUT TIME ZONE, 
	escalated BOOLEAN NOT NULL, 
	escalation_reason VARCHAR(255), 
	support_count INTEGER NOT NULL, 
	possible_duplicate BOOLEAN NOT NULL, 
	duplicate_of_id INTEGER, 
	client_request_id VARCHAR(64), 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	reviewed_at TIMESTAMP WITHOUT TIME ZONE, 
	resolved_at TIMESTAMP WITHOUT TIME ZONE, 
	verified_at TIMESTAMP WITHOUT TIME ZONE, 
	closed_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(citizen_id) REFERENCES users (id), 
	FOREIGN KEY(department_id) REFERENCES departments (id), 
	FOREIGN KEY(office_id) REFERENCES offices (id), 
	FOREIGN KEY(ward_id) REFERENCES wards (id), 
	FOREIGN KEY(assigned_to_id) REFERENCES users (id), 
	FOREIGN KEY(duplicate_of_id) REFERENCES complaints (id), 
	UNIQUE (client_request_id)
);

CREATE INDEX IF NOT EXISTS ix_complaints_assigned_to_id ON complaints (assigned_to_id);

CREATE INDEX IF NOT EXISTS ix_complaints_category ON complaints (category);

CREATE INDEX IF NOT EXISTS ix_complaints_citizen_id ON complaints (citizen_id);

CREATE INDEX IF NOT EXISTS ix_complaints_created_at ON complaints (created_at);

CREATE INDEX IF NOT EXISTS ix_complaints_department_id ON complaints (department_id);

CREATE INDEX IF NOT EXISTS ix_complaints_escalated ON complaints (escalated);

CREATE INDEX IF NOT EXISTS ix_complaints_latitude ON complaints (latitude);

CREATE INDEX IF NOT EXISTS ix_complaints_longitude ON complaints (longitude);

CREATE INDEX IF NOT EXISTS ix_complaints_office_id ON complaints (office_id);

CREATE INDEX IF NOT EXISTS ix_complaints_priority_score ON complaints (priority_score);

CREATE UNIQUE INDEX IF NOT EXISTS ix_complaints_reference ON complaints (reference);

CREATE INDEX IF NOT EXISTS ix_complaints_related_count ON complaints (related_count);

CREATE INDEX IF NOT EXISTS ix_complaints_report_count ON complaints (report_count);

CREATE INDEX IF NOT EXISTS ix_complaints_risk_level ON complaints (risk_level);

CREATE INDEX IF NOT EXISTS ix_complaints_routing_status ON complaints (routing_status);

CREATE INDEX IF NOT EXISTS ix_complaints_sla_due_at ON complaints (sla_due_at);

CREATE INDEX IF NOT EXISTS ix_complaints_status ON complaints (status);

CREATE INDEX IF NOT EXISTS ix_complaints_ward_id ON complaints (ward_id);

CREATE TABLE IF NOT EXISTS audit_logs (
	id SERIAL NOT NULL, 
	actor_id INTEGER, 
	action VARCHAR(60) NOT NULL, 
	entity_type VARCHAR(40) NOT NULL, 
	entity_id INTEGER, 
	complaint_id INTEGER, 
	details JSON NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(actor_id) REFERENCES users (id), 
	FOREIGN KEY(complaint_id) REFERENCES complaints (id)
);

CREATE INDEX IF NOT EXISTS ix_audit_logs_action ON audit_logs (action);

CREATE INDEX IF NOT EXISTS ix_audit_logs_actor_id ON audit_logs (actor_id);

CREATE INDEX IF NOT EXISTS ix_audit_logs_complaint_id ON audit_logs (complaint_id);

CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs (created_at);

CREATE TABLE IF NOT EXISTS complaint_status_history (
	id SERIAL NOT NULL, 
	complaint_id INTEGER NOT NULL, 
	from_status VARCHAR(20), 
	to_status VARCHAR(20) NOT NULL, 
	note TEXT, 
	is_internal BOOLEAN NOT NULL, 
	changed_by_id INTEGER, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(complaint_id) REFERENCES complaints (id), 
	FOREIGN KEY(changed_by_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_complaint_status_history_complaint_id ON complaint_status_history (complaint_id);

CREATE TABLE IF NOT EXISTS complaint_supports (
	id SERIAL NOT NULL, 
	complaint_id INTEGER NOT NULL, 
	user_id INTEGER NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_complaint_support_user UNIQUE (complaint_id, user_id), 
	FOREIGN KEY(complaint_id) REFERENCES complaints (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_complaint_supports_complaint_id ON complaint_supports (complaint_id);

CREATE INDEX IF NOT EXISTS ix_complaint_supports_user_id ON complaint_supports (user_id);

CREATE TABLE IF NOT EXISTS department_assignments (
	id SERIAL NOT NULL, 
	complaint_id INTEGER NOT NULL, 
	department_id INTEGER, 
	office_id INTEGER, 
	assigned_to_id INTEGER, 
	assigned_by_id INTEGER, 
	reason VARCHAR(30) NOT NULL, 
	note TEXT, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(complaint_id) REFERENCES complaints (id), 
	FOREIGN KEY(department_id) REFERENCES departments (id), 
	FOREIGN KEY(office_id) REFERENCES offices (id), 
	FOREIGN KEY(assigned_to_id) REFERENCES users (id), 
	FOREIGN KEY(assigned_by_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_department_assignments_complaint_id ON department_assignments (complaint_id);

CREATE TABLE IF NOT EXISTS duplicate_candidates (
	id SERIAL NOT NULL, 
	complaint_id INTEGER NOT NULL, 
	candidate_id INTEGER NOT NULL, 
	score FLOAT NOT NULL, 
	distance_m FLOAT, 
	text_similarity FLOAT, 
	image_similarity FLOAT, 
	status VARCHAR(20) NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_duplicate_pair UNIQUE (complaint_id, candidate_id), 
	FOREIGN KEY(complaint_id) REFERENCES complaints (id), 
	FOREIGN KEY(candidate_id) REFERENCES complaints (id)
);

CREATE INDEX IF NOT EXISTS ix_duplicate_candidates_candidate_id ON duplicate_candidates (candidate_id);

CREATE INDEX IF NOT EXISTS ix_duplicate_candidates_complaint_id ON duplicate_candidates (complaint_id);

CREATE TABLE IF NOT EXISTS notifications (
	id SERIAL NOT NULL, 
	user_id INTEGER NOT NULL, 
	complaint_id INTEGER, 
	title VARCHAR(160) NOT NULL, 
	message TEXT NOT NULL, 
	type VARCHAR(30) NOT NULL, 
	is_read BOOLEAN NOT NULL, 
	dedupe_key VARCHAR(160), 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id), 
	FOREIGN KEY(complaint_id) REFERENCES complaints (id)
);

CREATE INDEX IF NOT EXISTS ix_notifications_complaint_id ON notifications (complaint_id);

CREATE INDEX IF NOT EXISTS ix_notifications_created_at ON notifications (created_at);

CREATE UNIQUE INDEX IF NOT EXISTS ix_notifications_dedupe_key ON notifications (dedupe_key);

CREATE INDEX IF NOT EXISTS ix_notifications_is_read ON notifications (is_read);

CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications (user_id);

CREATE TABLE IF NOT EXISTS resolution_feedback (
	id SERIAL NOT NULL, 
	complaint_id INTEGER NOT NULL, 
	citizen_id INTEGER NOT NULL, 
	verdict VARCHAR(20) NOT NULL, 
	rating INTEGER, 
	comment TEXT, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(complaint_id) REFERENCES complaints (id), 
	FOREIGN KEY(citizen_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_resolution_feedback_complaint_id ON resolution_feedback (complaint_id);

CREATE TABLE IF NOT EXISTS resolution_proofs (
	id SERIAL NOT NULL, 
	complaint_id INTEGER NOT NULL, 
	employee_id INTEGER NOT NULL, 
	notes TEXT NOT NULL, 
	completed_at TIMESTAMP WITHOUT TIME ZONE, 
	completion_lat FLOAT, 
	completion_lng FLOAT, 
	client_request_id VARCHAR(64), 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(complaint_id) REFERENCES complaints (id), 
	FOREIGN KEY(employee_id) REFERENCES users (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_resolution_proofs_client_request_id ON resolution_proofs (client_request_id);

CREATE INDEX IF NOT EXISTS ix_resolution_proofs_complaint_id ON resolution_proofs (complaint_id);

CREATE TABLE IF NOT EXISTS risk_alerts (
	id SERIAL NOT NULL, 
	complaint_id INTEGER NOT NULL, 
	office_id INTEGER, 
	risk_level VARCHAR(10) NOT NULL, 
	previous_level VARCHAR(10), 
	kind VARCHAR(20) NOT NULL, 
	dedupe_key VARCHAR(120) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	priority_score INTEGER, 
	response_due_at TIMESTAMP WITHOUT TIME ZONE, 
	acknowledged_by_id INTEGER, 
	acknowledged_at TIMESTAMP WITHOUT TIME ZONE, 
	acknowledgement_note TEXT, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(complaint_id) REFERENCES complaints (id), 
	FOREIGN KEY(office_id) REFERENCES offices (id), 
	FOREIGN KEY(acknowledged_by_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_risk_alerts_complaint_id ON risk_alerts (complaint_id);

CREATE INDEX IF NOT EXISTS ix_risk_alerts_created_at ON risk_alerts (created_at);

CREATE UNIQUE INDEX IF NOT EXISTS ix_risk_alerts_dedupe_key ON risk_alerts (dedupe_key);

CREATE INDEX IF NOT EXISTS ix_risk_alerts_office_id ON risk_alerts (office_id);

CREATE INDEX IF NOT EXISTS ix_risk_alerts_status ON risk_alerts (status);

CREATE TABLE IF NOT EXISTS complaint_images (
	id SERIAL NOT NULL, 
	complaint_id INTEGER NOT NULL, 
	proof_id INTEGER, 
	kind VARCHAR(20) NOT NULL, 
	filename VARCHAR(64) NOT NULL, 
	original_name VARCHAR(255), 
	content_type VARCHAR(50) NOT NULL, 
	width INTEGER, 
	height INTEGER, 
	size_bytes INTEGER, 
	phash VARCHAR(16), 
	faces_blurred BOOLEAN NOT NULL, 
	uploaded_by_id INTEGER, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(complaint_id) REFERENCES complaints (id), 
	FOREIGN KEY(proof_id) REFERENCES resolution_proofs (id), 
	UNIQUE (filename), 
	FOREIGN KEY(uploaded_by_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_complaint_images_complaint_id ON complaint_images (complaint_id);

CREATE INDEX IF NOT EXISTS ix_complaint_images_phash ON complaint_images (phash);

CREATE INDEX IF NOT EXISTS ix_complaint_images_proof_id ON complaint_images (proof_id);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'postgis') THEN
        CREATE EXTENSION IF NOT EXISTS postgis;
        EXECUTE 'CREATE INDEX IF NOT EXISTS ix_complaints_geog ON complaints USING GIST ((ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography))';
    END IF;
EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PostGIS not enabled (insufficient privilege) - lat/lng fallback will be used.';
END
$$;
