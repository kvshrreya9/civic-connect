from datetime import timedelta

from app.extensions import db, utcnow
from app.models import Complaint, Notification
from app.services.sla_service import check_escalations, sla_hours_for, sla_status
from tests.conftest import register, submit_complaint


def test_severity_scales_sla(app):
    assert sla_hours_for("pothole", "critical") < sla_hours_for("pothole", "medium") < sla_hours_for("pothole", "low")
    assert sla_hours_for("garbage", "medium") == 24


def test_states_progress(client):
    token, _ = register(client)
    complaint_id = submit_complaint(client, token).get_json()["complaint"]["id"]
    complaint = db.session.get(Complaint, complaint_id)
    assert sla_status(complaint)["state"] == "on_track"
    hours = sla_hours_for(complaint.category, complaint.severity)
    complaint.created_at = utcnow() - timedelta(hours=hours * 0.8)
    complaint.sla_due_at = complaint.created_at + timedelta(hours=hours)
    assert sla_status(complaint)["state"] == "at_risk"
    complaint.created_at = utcnow() - timedelta(hours=hours * 2)
    complaint.sla_due_at = complaint.created_at + timedelta(hours=hours)
    assert sla_status(complaint)["state"] == "overdue"


def test_escalation_flags_and_notifies(client):
    token, _ = register(client)
    complaint_id = submit_complaint(client, token).get_json()["complaint"]["id"]
    complaint = db.session.get(Complaint, complaint_id)
    complaint.created_at = utcnow() - timedelta(days=10)
    complaint.sla_due_at = utcnow() - timedelta(days=5)
    db.session.commit()
    assert check_escalations() == 1
    assert complaint.escalated is True
    assert Notification.query.filter_by(complaint_id=complaint_id, type="escalation").count() >= 1
    assert check_escalations() == 0


def test_resolved_on_time_is_met(client):
    token, _ = register(client)
    complaint_id = submit_complaint(client, token).get_json()["complaint"]["id"]
    complaint = db.session.get(Complaint, complaint_id)
    complaint.status = "resolution_submitted"
    complaint.resolved_at = utcnow()
    assert sla_status(complaint)["state"] == "met"
