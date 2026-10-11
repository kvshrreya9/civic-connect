from app.models import Complaint
from tests.conftest import auth, register, submit_complaint


def test_idempotent_replay_returns_same_complaint(client):
    token, _ = register(client)
    key = {"Idempotency-Key": "offline-draft-1234abcd"}
    first = submit_complaint(client, token, headers=key)
    second = submit_complaint(client, token, headers=key)
    assert first.status_code == 201
    assert second.status_code == 200
    assert second.get_json()["idempotent_replay"] is True
    assert first.get_json()["complaint"]["id"] == second.get_json()["complaint"]["id"]
    assert Complaint.query.count() == 1


def test_idempotency_key_in_form_field(client):
    token, _ = register(client)
    submit_complaint(client, token, client_request_id="form-key-123456789")
    submit_complaint(client, token, client_request_id="form-key-123456789")
    assert Complaint.query.count() == 1


def test_key_reuse_by_other_user_is_rejected(client):
    token_a, _ = register(client)
    token_b, _ = register(client)
    key = {"Idempotency-Key": "shared-key-12345678"}
    submit_complaint(client, token_a, headers=key)
    response = submit_complaint(client, token_b, headers=key)
    assert response.status_code == 409


def test_malformed_key_rejected(client):
    token, _ = register(client)
    response = submit_complaint(client, token, headers={"Idempotency-Key": "bad key with spaces!"})
    assert response.status_code == 400


def test_different_keys_create_separate_reports(client):
    token, _ = register(client)
    submit_complaint(client, token, headers={"Idempotency-Key": "key-aaaaaaaaaaaa"})
    submit_complaint(client, token, headers={"Idempotency-Key": "key-bbbbbbbbbbbb"})
    assert client.get("/api/complaints", headers=auth(token)).get_json()["total"] == 2
