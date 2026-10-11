import os

from app.models import ComplaintImage, ResolutionProof
from tests.conftest import (
    assign_to_worker, auth, create_staff, make_image_bytes, new_complaint, upload_resolution,
)


def _setup(app, client):
    citizen, complaint = new_complaint(client, images=[make_image_bytes()])
    officer, _ = create_staff(app, client)
    worker_token, worker = create_staff(app, client, role="field_worker")
    assign_to_worker(client, officer, complaint["id"], worker.id)
    return citizen, officer, worker_token, complaint["id"]


def test_resolution_requires_photo(app, client):
    _, _, worker, cid = _setup(app, client)
    assert upload_resolution(client, worker, cid, images=False).status_code == 422


def test_unassigned_worker_cannot_upload(app, client):
    _, _, _, cid = _setup(app, client)
    other_worker, _ = create_staff(app, client, role="field_worker")
    assert upload_resolution(client, other_worker, cid).status_code == 403


def test_resolution_upload_stored_separately_and_shown_to_citizen(app, client):
    citizen, _, worker, cid = _setup(app, client)
    response = upload_resolution(client, worker, cid)
    assert response.status_code == 201, response.get_json()
    assert response.get_json()["complaint"]["status"] == "resolution_submitted"
    stored = ComplaintImage.query.filter_by(kind="resolution").first()
    assert stored.filename.startswith("resolution/")
    assert os.path.isfile(os.path.join(app.config["UPLOAD_FOLDER"], "resolution", stored.filename.split("/")[1]))
    assert ComplaintImage.query.filter_by(kind="report").first().filename.startswith("report/")

    mine = client.get("/api/complaints", headers=auth(citizen)).get_json()["items"][0]
    resolution = mine["resolution"]
    assert resolution["description"].startswith("Pothole filled")
    assert resolution["photos"] and resolution["completed_at"]
    assert resolution["verification_status"] == "awaiting_verification"
    photo = client.get(resolution["photos"][0]["url"])
    assert photo.status_code == 200 and photo.mimetype == "image/jpeg"
    notes = client.get("/api/notifications", headers=auth(citizen)).get_json()["items"]
    assert any(n["type"] == "resolution_uploaded" for n in notes)


def test_administrator_can_submit_required_resolution_photo_and_notify_citizen(app, client):
    citizen, complaint = new_complaint(client, images=[make_image_bytes()])
    admin_token, _ = create_staff(app, client, role="admin")
    status = client.post(
        f"/api/municipal/complaints/{complaint['id']}/status",
        json={"status": "reviewed"},
        headers=auth(admin_token),
    )
    assert status.status_code == 200

    response = upload_resolution(client, admin_token, complaint["id"])
    assert response.status_code == 201, response.get_json()
    assert response.get_json()["complaint"]["status"] == "resolution_submitted"
    assert response.get_json()["complaint"]["resolution"]["photos"]

    notes = client.get("/api/notifications", headers=auth(citizen)).get_json()["items"]
    assert any(note["type"] == "resolution_uploaded" for note in notes)


def test_duplicate_resolution_request_is_idempotent(app, client):
    _, _, worker, cid = _setup(app, client)
    key = {"Idempotency-Key": "proof-key-12345678"}
    first = upload_resolution(client, worker, cid, headers=key)
    second = upload_resolution(client, worker, cid, headers=key)
    assert first.status_code == 201 and second.status_code == 200
    assert second.get_json()["idempotent_replay"] is True
    assert ResolutionProof.query.count() == 1
    third = upload_resolution(client, worker, cid)
    assert third.status_code == 400  # already resolution_submitted


def test_confirmation(app, client):
    citizen, officer, worker, cid = _setup(app, client)
    upload_resolution(client, worker, cid)
    details = client.get(f"/api/verification/{cid}", headers=auth(citizen)).get_json()
    assert len(details["before"]) == 1 and len(details["after"]) == 1 and details["can_submit_feedback"]
    response = client.post(f"/api/verification/{cid}/feedback", json={"verdict": "confirmed", "rating": 5}, headers=auth(citizen))
    assert response.status_code == 201 and response.get_json()["complaint"]["status"] == "verified"


def test_dispute_reopens_preserves_evidence_and_notifies_office(app, client):
    citizen, officer, worker, cid = _setup(app, client)
    upload_resolution(client, worker, cid)
    missing = client.post(f"/api/verification/{cid}/feedback", json={"verdict": "disputed"}, headers=auth(citizen))
    assert missing.status_code == 422
    response = client.post(f"/api/verification/{cid}/feedback",
                           json={"verdict": "disputed", "comment": "The pothole is back after rain"}, headers=auth(citizen))
    data = response.get_json()["complaint"]
    assert data["status"] == "reopened" and data["escalated"] is True
    assert data["resolution"]["photos"]  # evidence preserved
    assert any(h["to_status"] == "resolution_submitted" for h in data["history"])
    office_notes = client.get("/api/notifications", headers=auth(officer)).get_json()["items"]
    assert any(n["type"] == "disputed" for n in office_notes)
    queue = client.get("/api/municipal/complaints?status=reopened", headers=auth(officer)).get_json()
    assert [i["id"] for i in queue["items"]] == [cid]


def test_only_owner_can_verify(app, client):
    from tests.conftest import register

    _, _, worker, cid = _setup(app, client)
    upload_resolution(client, worker, cid)
    stranger, _ = register(client)
    assert client.post(f"/api/verification/{cid}/feedback", json={"verdict": "confirmed"},
                       headers=auth(stranger)).status_code == 403
