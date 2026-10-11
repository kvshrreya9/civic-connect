from tests.conftest import auth, create_staff, register


def test_register_and_me(client):
    token, user = register(client, email="asha@example.com")
    assert user["role"] == "citizen"
    response = client.get("/api/auth/me", headers=auth(token))
    assert response.status_code == 200
    assert response.get_json()["user"]["email"] == "asha@example.com"


def test_register_rejects_weak_password_and_duplicates(client):
    bad = client.post("/api/auth/register", json={"name": "A B", "email": "x@example.com", "password": "short"})
    assert bad.status_code == 422 and "password" in bad.get_json()["errors"]
    register(client, email="dup@example.com")
    again = client.post("/api/auth/register", json={"name": "Dup", "email": "dup@example.com", "password": "Password123"})
    assert again.status_code == 409


def test_citizen_login_and_invalid_credentials(client):
    register(client, email="login@example.com", password="Password123")
    ok = client.post("/api/auth/login", json={"email": "LOGIN@example.com", "password": "Password123"})
    assert ok.status_code == 200 and ok.get_json()["access_token"]
    bad = client.post("/api/auth/login", json={"email": "login@example.com", "password": "wrong-pass1"})
    assert bad.status_code == 401


def test_register_cannot_escalate_role(client):
    response = client.post("/api/auth/register", json={
        "name": "Sneaky", "email": "sneaky@example.com", "password": "Password123", "role": "admin"})
    assert response.get_json()["user"]["role"] == "citizen"


def test_separate_portals(app, client):
    register(client, email="citizen@example.com")
    _, staff_user = create_staff(app, client, role="officer", email="officer@example.com")
    staff_on_citizen = client.post("/api/auth/login", json={"email": "officer@example.com", "password": "Password123"})
    assert staff_on_citizen.status_code == 403
    citizen_on_staff = client.post("/api/auth/municipal/login", json={"email": "citizen@example.com", "password": "Password123"})
    assert citizen_on_staff.status_code == 403
    office_id = staff_user.office_id
    staff_ok = client.post("/api/auth/municipal/login", json={
        "email": "officer@example.com", "password": "Password123", "office_id": str(office_id),
    })
    assert staff_ok.status_code == 200
    assert staff_ok.get_json()["user"]["office"]["code"] == "ALPHA"
    wrong_office = client.post("/api/auth/municipal/login", json={
        "email": "officer@example.com", "password": "Password123", "office_id": "999",
    })
    assert wrong_office.status_code == 403


def test_admin_municipal_login_checks_all_offices_selection_when_provided(app, client):
    _, admin = create_staff(app, client, role="admin")
    denied = client.post("/api/auth/municipal/login", json={
        "email": admin.email, "password": "Password123", "office_id": "1",
    })
    assert denied.status_code == 403
    allowed = client.post("/api/auth/municipal/login", json={
        "email": admin.email, "password": "Password123", "office_id": "all",
    })
    assert allowed.status_code == 200


def test_citizen_cannot_use_staff_apis(client):
    token, _ = register(client)
    for path in ("/api/municipal/summary", "/api/municipal/complaints", "/api/municipal/alerts", "/api/admin/offices"):
        assert client.get(path, headers=auth(token)).status_code == 403


def test_only_admin_creates_staff(app, client):
    officer_token, _ = create_staff(app, client, role="officer")
    payload = {"name": "New Worker", "email": "w@example.com", "password": "Password123", "role": "field_worker", "office_id": 1}
    assert client.post("/api/admin/staff", json=payload, headers=auth(officer_token)).status_code == 403
    admin_token, _ = create_staff(app, client, role="admin")
    created = client.post("/api/admin/staff", json=payload, headers=auth(admin_token))
    assert created.status_code == 201 and created.get_json()["user"]["role"] == "field_worker"
    no_office = client.post("/api/admin/staff", json={**payload, "email": "w2@example.com", "office_id": None},
                            headers=auth(admin_token))
    assert no_office.status_code == 422


def test_protected_route_requires_token(client):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer nonsense"}).status_code == 401
