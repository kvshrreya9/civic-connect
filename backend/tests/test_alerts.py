from app.extensions import db
from app.models import Complaint, Notification, Office, RiskAlert
from app.services import risk_service
from tests.conftest import BETA_CENTER, auth, create_staff, new_complaint


def test_critical_complaint_creates_alert_for_correct_office(app, client):
    alpha, alpha_user = create_staff(app, client)
    beta, _ = create_staff(app, client, office_code="BETA")
    _, complaint = new_complaint(client, severity="critical", safety_risk="true")
    assert complaint["risk_level"] == "critical"
    alerts = client.get("/api/municipal/alerts", headers=auth(alpha)).get_json()["items"]
    assert len(alerts) == 1 and alerts[0]["risk_level"] == "critical" and not alerts[0]["acknowledged"]
    assert alerts[0]["complaint"]["reference"] == complaint["reference"]
    assert client.get("/api/municipal/alerts", headers=auth(beta)).get_json()["total"] == 0
    assert Notification.query.filter_by(user_id=alpha_user.id, type="risk_alert").count() == 1


def test_low_risk_creates_no_alert(app, client):
    create_staff(app, client)
    new_complaint(client, severity="low", safety_risk="false", affected_count="1")
    assert RiskAlert.query.count() == 0


def test_alerts_and_notifications_are_not_duplicated(app, client):
    _, officer_user = create_staff(app, client)
    _, complaint = new_complaint(client, severity="critical", safety_risk="true")
    c = db.session.get(Complaint, complaint["id"])
    for _ in range(3):
        risk_service.evaluate(c)
        db.session.commit()
    client.get("/api/municipal/summary")
    assert RiskAlert.query.filter_by(complaint_id=c.id).count() == 1
    assert Notification.query.filter_by(user_id=officer_user.id, type="risk_alert").count() == 1


def test_escalation_from_high_to_critical(app, client):
    officer, _ = create_staff(app, client)
    _, complaint = new_complaint(client, severity="high", safety_risk="true", affected_count="1")
    assert complaint["risk_level"] == "high"
    c = db.session.get(Complaint, complaint["id"])
    c.affected_count = 500
    c.severity = "critical"
    risk_service.evaluate(c)
    db.session.commit()
    kinds = {a.kind for a in RiskAlert.query.filter_by(complaint_id=c.id)}
    assert kinds == {"high_risk", "critical", "escalation"}
    notes = client.get("/api/notifications", headers=auth(officer)).get_json()["items"]
    assert any(n["type"] == "escalation" for n in notes)


def test_acknowledge_and_action(app, client):
    officer, user = create_staff(app, client)
    beta, _ = create_staff(app, client, office_code="BETA")
    new_complaint(client, severity="critical")
    alert = client.get("/api/municipal/alerts", headers=auth(officer)).get_json()["items"][0]
    assert client.post(f"/api/municipal/alerts/{alert['id']}/acknowledge", headers=auth(beta)).status_code == 404
    ack = client.post(f"/api/municipal/alerts/{alert['id']}/acknowledge", json={"note": "Crew dispatched"},
                      headers=auth(officer)).get_json()["alert"]
    assert ack["acknowledged"] and ack["acknowledged_by"]["id"] == user.id and ack["acknowledged_at"]
    acted = client.post(f"/api/municipal/alerts/{alert['id']}/actions", json={"note": "Barricades placed"},
                        headers=auth(officer)).get_json()["alert"]
    assert any(a["details"].get("note") == "Barricades placed" for a in acted["actions"])
    assert client.get("/api/municipal/alerts/count", headers=auth(officer)).get_json()["unacknowledged"] == 0
    filtered = client.get("/api/municipal/alerts?status=open", headers=auth(officer)).get_json()
    assert filtered["total"] == 0


def test_alert_moves_with_office_transfer(app, client):
    alpha, _ = create_staff(app, client)
    beta, beta_user = create_staff(app, client, office_code="BETA")
    _, complaint = new_complaint(client, severity="critical")
    beta_office = Office.query.filter_by(code="BETA").first()
    client.post(f"/api/municipal/complaints/{complaint['id']}/transfer", json={"office_id": beta_office.id},
                headers=auth(alpha))
    assert client.get("/api/municipal/alerts", headers=auth(beta)).get_json()["total"] == 1
    assert client.get("/api/municipal/alerts", headers=auth(alpha)).get_json()["total"] == 0
    assert Notification.query.filter_by(user_id=beta_user.id, type="risk_alert").count() >= 1


def test_unmapped_critical_alerts_admin(app, client):
    admin, admin_user = create_staff(app, client, role="admin")
    new_complaint(client, severity="critical", latitude="12.5", longitude="79.5")
    alerts = client.get("/api/municipal/alerts", headers=auth(admin)).get_json()["items"]
    assert alerts and alerts[0]["office"] is None
    assert Notification.query.filter_by(user_id=admin_user.id, type="risk_alert").count() == 1


def test_routed_critical_alert_notifies_administrators(app, client):
    admin_token, admin_user = create_staff(app, client, role="admin")
    new_complaint(client, severity="critical")

    alerts = client.get("/api/municipal/alerts", headers=auth(admin_token)).get_json()["items"]
    notifications = client.get("/api/notifications", headers=auth(admin_token)).get_json()["items"]

    assert alerts and alerts[0]["risk_level"] == "critical"
    assert any(item["type"] == "risk_alert" for item in notifications)
    assert Notification.query.filter_by(user_id=admin_user.id, type="risk_alert").count() == 1


def test_critical_alert_calls_responsible_office_when_twilio_is_configured(app, client, monkeypatch):
    create_staff(app, client, role="admin")
    office = Office.query.filter_by(code="ALPHA").first()
    office.critical_alert_phone = "+14155550123"
    db.session.commit()
    app.config.update(
        TWILIO_ACCOUNT_SID="ACtest",
        TWILIO_AUTH_TOKEN="test-token",
        TWILIO_FROM_NUMBER="+14155550000",
    )
    request_data = {}

    class Accepted:
        ok = True

    def fake_post(url, **kwargs):
        request_data.update(url=url, **kwargs)
        return Accepted()

    monkeypatch.setattr("app.services.external_notifier.requests.post", fake_post)
    new_complaint(client, severity="critical")

    assert request_data["url"].endswith("/Accounts/ACtest/Calls.json")
    assert request_data["data"]["To"] == "+14155550123"
    assert request_data["data"]["From"] == "+14155550000"
    assert "CRITICAL" in request_data["data"]["Twiml"]

    from app.models import AuditLog

    dispatch = AuditLog.query.filter_by(action="alert.external_dispatch").one()
    office_result = next(
        item for item in dispatch.details["results"] if item.get("recipient") == f"office:{office.id}"
    )
    assert office_result["call"] == "accepted"


def test_risk_filter_on_alerts_page(app, client):
    officer, _ = create_staff(app, client)
    new_complaint(client, severity="critical")
    new_complaint(client, severity="high", safety_risk="true", affected_count="1", category="garbage",
                  latitude=str(BETA_CENTER[0] - 0.19))
    high = client.get("/api/municipal/alerts?risk=high", headers=auth(officer)).get_json()["items"]
    assert high and all(a["risk_level"] == "high" for a in high)
