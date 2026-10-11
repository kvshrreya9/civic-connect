from app.extensions import db
from app.models import Notification
from app.services import notification_service
from tests.conftest import auth, create_staff, new_complaint


def test_notifications_persist_and_mark_read(app, client):
    citizen, complaint = new_complaint(client)
    data = client.get("/api/notifications", headers=auth(citizen)).get_json()
    assert data["unread"] == 1 and data["items"][0]["complaint_reference"] == complaint["reference"]
    client.post(f"/api/notifications/{data['items'][0]['id']}/read", headers=auth(citizen))
    # A fresh login (new token) still sees the same persisted notification.
    assert client.get("/api/notifications", headers=auth(citizen)).get_json()["unread"] == 0


def test_dedupe_key_prevents_duplicates(app, client):
    _, user = create_staff(app, client)
    for _ in range(3):
        notification_service.notify(user.id, "Same event", "msg", "info", dedupe_key="event:1")
        db.session.commit()
    assert Notification.query.filter_by(user_id=user.id, title="Same event").count() == 1


def test_office_officers_notified_of_new_complaint(app, client):
    officer, _ = create_staff(app, client)
    new_complaint(client)
    items = client.get("/api/notifications", headers=auth(officer)).get_json()["items"]
    assert any(n["type"] == "new_complaint" for n in items)


def test_notifications_rolled_back_with_failed_transaction(app, client):
    _, user = create_staff(app, client)
    notification_service.notify(user.id, "Uncommitted", "msg")
    db.session.rollback()
    assert Notification.query.filter_by(title="Uncommitted").count() == 0
