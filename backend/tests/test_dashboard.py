from tests.conftest import BETA_CENTER, auth, create_staff, new_complaint, register, submit_complaint


def test_public_dashboard_starts_at_zero(client):
    data = client.get("/api/dashboard/public").get_json()
    assert data["totals"]["total"] == 0 and data["totals"]["resolved"] == 0 and data["totals"]["open"] == 0


def test_public_dashboard_shape(client):
    token, _ = register(client)
    submit_complaint(client, token)
    submit_complaint(client, token, category="garbage", title="Garbage pile not cleared")
    data = client.get("/api/dashboard/public").get_json()
    assert data["totals"]["total"] == 2 and data["totals"]["open"] == 2
    assert len(data["timeline"]) == 30
    assert {c["category"] for c in data["by_category"]} == {"pothole", "garbage"}


def test_municipal_summary_is_jurisdiction_scoped(app, client):
    officer, _ = create_staff(app, client)
    beta, _ = create_staff(app, client, office_code="BETA")
    new_complaint(client, severity="critical")
    new_complaint(client, latitude=str(BETA_CENTER[0]), longitude=str(BETA_CENTER[1]), severity="low",
                  safety_risk="false", affected_count="1")
    alpha_summary = client.get("/api/municipal/summary", headers=auth(officer)).get_json()
    assert alpha_summary["total"] == 1 and alpha_summary["critical"] == 1 and alpha_summary["new"] == 1
    assert alpha_summary["unassigned"] == 1 and alpha_summary["assigned_to_staff"] == 0
    assert alpha_summary["active_field_workers"] == 0 and alpha_summary["alerts_unacknowledged"] == 1
    beta_summary = client.get("/api/municipal/summary", headers=auth(beta)).get_json()
    assert beta_summary["total"] == 1 and beta_summary["critical"] == 0


def test_municipal_summary_counts_assigned_open_work_and_active_workers(app, client):
    officer, _ = create_staff(app, client)
    worker_token, worker = create_staff(app, client, role="field_worker")
    _, complaint = new_complaint(client)
    from tests.conftest import assign_to_worker

    assign_to_worker(client, officer, complaint["id"], worker.id)
    summary = client.get("/api/municipal/summary", headers=auth(officer)).get_json()
    assert summary["unassigned"] == 0
    assert summary["assigned_to_staff"] == 1
    assert summary["active_field_workers"] == 1
    assigned_queue = client.get(
        "/api/municipal/complaints?assigned_to=assigned",
        headers=auth(officer),
    ).get_json()
    assert [issue["id"] for issue in assigned_queue["items"]] == [complaint["id"]]
    worker_summary = client.get("/api/municipal/summary", headers=auth(worker_token)).get_json()
    assert worker_summary["assigned_to_me"] == 1


def test_citizen_summary(client):
    token, _ = register(client)
    submit_complaint(client, token)
    citizen = client.get("/api/dashboard/citizen", headers=auth(token)).get_json()
    assert citizen["total"] == 1 and citizen["open"] == 1
