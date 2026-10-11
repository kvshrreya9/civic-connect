from tests.conftest import (
    CENTER, assign_to_worker, auth, create_staff, make_image_bytes, new_complaint, register, submit_complaint,
)


def test_create_complaint_with_image_is_routed(client):
    token, _ = register(client)
    response = submit_complaint(client, token, images=[make_image_bytes()])
    assert response.status_code == 201, response.get_json()
    complaint = response.get_json()["complaint"]
    assert complaint["reference"].startswith("CC-")
    assert complaint["status"] == "submitted"
    assert complaint["department"]["code"] == "RDS"
    assert complaint["office"]["code"] == "ALPHA" and complaint["ward"]["code"] == "A1"
    assert len(complaint["images"]) == 1 and "?t=" in complaint["images"][0]["url"]
    assert complaint["risk_level"] in ("low", "medium", "high", "critical")


def test_validation_errors(client):
    token, _ = register(client)
    response = submit_complaint(client, token, title="x", latitude="200")
    assert response.status_code == 422
    errors = response.get_json()["errors"]
    assert "title" in errors and "location" in errors


def test_affected_count_may_be_zero(client):
    token, _ = register(client)
    assert submit_complaint(client, token, affected_count="0").status_code == 201


def test_invalid_image_rejected(client):
    import io

    token, _ = register(client)
    assert submit_complaint(client, token, images=[io.BytesIO(b"not an image at all")]).status_code == 400


def test_citizen_sees_only_own_complaints(client):
    token_a, _ = register(client)
    token_b, _ = register(client)
    _, complaint = new_complaint(client, token_a, images=[make_image_bytes()])
    assert client.get("/api/complaints", headers=auth(token_b)).get_json()["total"] == 0
    assert client.get("/api/complaints", headers=auth(token_a)).get_json()["total"] == 1
    other_view = client.get(f"/api/complaints/{complaint['id']}", headers=auth(token_b)).get_json()["complaint"]
    assert other_view["visibility"] == "public" and other_view["images"] == []
    assert client.get(f"/api/verification/{complaint['id']}", headers=auth(token_b)).status_code == 403


def test_support_toggle(client):
    owner, _ = register(client)
    supporter, _ = register(client)
    _, complaint = new_complaint(client, owner)
    assert client.post(f"/api/complaints/{complaint['id']}/support", headers=auth(owner)).status_code == 400
    first = client.post(f"/api/complaints/{complaint['id']}/support", headers=auth(supporter)).get_json()
    assert first["supported"] is True and first["support_count"] == 1
    second = client.post(f"/api/complaints/{complaint['id']}/support", headers=auth(supporter)).get_json()
    assert second["supported"] is False and second["support_count"] == 0


def test_public_map_hides_reporter(client):
    new_complaint(client)
    points = client.get("/api/complaints/map").get_json()["points"]
    assert len(points) == 1 and "citizen_id" not in points[0] and "reporter" not in points[0]


def test_lifecycle_status_and_audit(app, client):
    _, complaint = new_complaint(client)
    officer, _ = create_staff(app, client)
    cid = complaint["id"]
    bad = client.post(f"/api/municipal/complaints/{cid}/status", json={"status": "verified"}, headers=auth(officer))
    assert bad.status_code == 400
    ok = client.post(f"/api/municipal/complaints/{cid}/status", json={"status": "reviewed", "note": "Checked on site"},
                     headers=auth(officer))
    assert ok.status_code == 200 and ok.get_json()["complaint"]["status"] == "reviewed"
    activity = client.get(f"/api/municipal/complaints/{cid}/activity", headers=auth(officer)).get_json()
    changes = [a for a in activity["audit"] if a["action"] == "complaint.status_changed"]
    assert changes[0]["details"]["from_status"] == "submitted" and changes[0]["details"]["to_status"] == "reviewed"
    assert changes[0]["actor"]["id"]


def test_internal_notes_hidden_from_citizen(app, client):
    citizen, complaint = new_complaint(client)
    officer, _ = create_staff(app, client)
    client.post(f"/api/municipal/complaints/{complaint['id']}/notes", json={"note": "Secret staff note"}, headers=auth(officer))
    citizen_view = client.get(f"/api/complaints/{complaint['id']}", headers=auth(citizen)).get_json()["complaint"]
    assert all(h["note"] != "Secret staff note" for h in citizen_view["history"])
    staff_view = client.get(f"/api/municipal/complaints/{complaint['id']}", headers=auth(officer)).get_json()["complaint"]
    assert any(h["note"] == "Secret staff note" for h in staff_view["history"])


def test_other_office_cannot_access_or_manage(app, client):
    _, complaint = new_complaint(client)
    beta_officer, _ = create_staff(app, client, office_code="BETA")
    assert client.get(f"/api/municipal/complaints/{complaint['id']}", headers=auth(beta_officer)).status_code == 404
    assert client.post(f"/api/municipal/complaints/{complaint['id']}/status", json={"status": "reviewed"},
                       headers=auth(beta_officer)).status_code == 404
    assert client.get("/api/municipal/complaints", headers=auth(beta_officer)).get_json()["total"] == 0


def test_assign_field_worker_and_reassign(app, client):
    citizen, complaint = new_complaint(client)
    officer, _ = create_staff(app, client)
    _, worker1 = create_staff(app, client, role="field_worker")
    _, worker2 = create_staff(app, client, role="field_worker")
    data = assign_to_worker(client, officer, complaint["id"], worker1.id)
    assert data["status"] == "assigned" and data["assigned_to"]["id"] == worker1.id
    data = assign_to_worker(client, officer, complaint["id"], worker2.id)
    assert data["assigned_to"]["id"] == worker2.id
    history = client.get(f"/api/municipal/complaints/{complaint['id']}/activity", headers=auth(officer)).get_json()
    assert len([a for a in history["assignments"] if a["reason"] == "manual"]) == 2
    notes = client.get("/api/notifications", headers=auth(citizen)).get_json()["items"]
    assert any(n["type"] == "assigned" for n in notes)


def test_cannot_assign_worker_from_other_office(app, client):
    _, complaint = new_complaint(client)
    officer, _ = create_staff(app, client)
    _, beta_worker = create_staff(app, client, office_code="BETA", role="field_worker")
    response = client.post(f"/api/municipal/complaints/{complaint['id']}/assign", json={"worker_id": beta_worker.id},
                           headers=auth(officer))
    assert response.status_code == 422


def test_field_worker_sees_only_assigned(app, client):
    _, c1 = new_complaint(client)
    new_complaint(client, latitude=str(CENTER[0] + 0.005))
    officer, _ = create_staff(app, client)
    worker_token, worker = create_staff(app, client, role="field_worker")
    assign_to_worker(client, officer, c1["id"], worker.id)
    listing = client.get("/api/municipal/complaints", headers=auth(worker_token)).get_json()
    assert [i["id"] for i in listing["items"]] == [c1["id"]]
    ok = client.post(f"/api/municipal/complaints/{c1['id']}/status", json={"status": "in_progress"}, headers=auth(worker_token))
    assert ok.status_code == 200
    assert client.post(f"/api/municipal/complaints/{c1['id']}/assign", json={"worker_id": worker.id},
                       headers=auth(worker_token)).status_code == 403


def test_close_after_verification(app, client):
    from tests.conftest import upload_resolution

    citizen, complaint = new_complaint(client)
    officer, _ = create_staff(app, client)
    worker_token, worker = create_staff(app, client, role="field_worker")
    assign_to_worker(client, officer, complaint["id"], worker.id)
    assert upload_resolution(client, worker_token, complaint["id"]).status_code == 201
    client.post(f"/api/verification/{complaint['id']}/feedback", json={"verdict": "confirmed"}, headers=auth(citizen))
    closed = client.post(f"/api/municipal/complaints/{complaint['id']}/status", json={"status": "closed"}, headers=auth(officer))
    assert closed.get_json()["complaint"]["status"] == "closed"
    notes = client.get("/api/notifications", headers=auth(citizen)).get_json()["items"]
    assert any(n["type"] == "closed" for n in notes)
