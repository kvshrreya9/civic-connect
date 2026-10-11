import pytest

from app.extensions import db
from app.models import Complaint
from tests.conftest import CENTER, auth, create_staff, new_complaint, register


def _set(cid, **values):
    complaint = db.session.get(Complaint, cid)
    for key, value in values.items():
        setattr(complaint, key, value)
    db.session.commit()


@pytest.fixture
def seeded(app, client):
    officer, _ = create_staff(app, client)
    ids = {}
    specs = [
        ("low", 10, 1, 0.000), ("critical", 60, 2, 0.020), ("high", 80, 7, 0.010),
        ("medium", 40, 3, 0.005), ("critical", 90, 2, 0.015),
    ]
    for i, (risk, priority, reports, offset) in enumerate(specs):
        _, c = new_complaint(client, latitude=str(CENTER[0] + offset), category="garbage" if i % 2 else "pothole",
                             title=f"Issue number {i} test")
        _set(c["id"], risk_level=risk, priority_score=priority, report_count=reports)
        ids[i] = c["id"]
    return officer, ids


def _ids(client, officer, query):
    response = client.get(f"/api/municipal/complaints?{query}", headers=auth(officer))
    assert response.status_code == 200, response.get_json()
    return [item["id"] for item in response.get_json()["items"]], response.get_json()


def test_risk_descending_then_priority(client, seeded):
    officer, ids = seeded
    order, _ = _ids(client, officer, "sort=risk:desc,priority:desc")
    assert order == [ids[4], ids[1], ids[2], ids[3], ids[0]]


def test_risk_ascending(client, seeded):
    officer, ids = seeded
    order, _ = _ids(client, officer, "sort=risk:asc,priority:asc")
    assert order[0] == ids[0] and order[-1] == ids[4]


def test_report_count_sorting(client, seeded):
    officer, ids = seeded
    order, data = _ids(client, officer, "sort=reports:desc,risk:desc")
    assert order[0] == ids[2] and order[1] == ids[3]
    assert order[2:4] == [ids[1], ids[4]]  # equal reports and equal risk -> stable id tie-break
    least, _ = _ids(client, officer, "sort=reports:asc")
    assert least[0] == ids[0]


def test_distance_from_office_uses_coordinates(client, seeded):
    officer, ids = seeded
    order, data = _ids(client, officer, "sort=distance_office:asc")
    assert order == [ids[0], ids[3], ids[2], ids[4], ids[1]]
    distances = [i["distance_from_office_m"] for i in data["items"]]
    assert distances == sorted(distances) and distances[0] < 1
    far, _ = _ids(client, officer, "sort=distance_office:desc")
    assert far[0] == ids[1]


def test_distance_from_selected_point(client, seeded):
    officer, ids = seeded
    order, data = _ids(client, officer, f"sort=distance_point:asc&ref_lat={CENTER[0] + 0.02}&ref_lng={CENTER[1]}")
    assert order[0] == ids[1] and data["items"][0]["distance_from_point_m"] < 1
    assert data["reference_point"]["latitude"] == pytest.approx(CENTER[0] + 0.02)


def test_distance_point_requires_reference(client, seeded):
    officer, _ = seeded
    response = client.get("/api/municipal/complaints?sort=distance_point:asc", headers=auth(officer))
    assert response.status_code == 422


def test_combined_rules_and_filters(client, seeded):
    officer, ids = seeded
    order, data = _ids(client, officer, "sort=risk:desc,distance_office:asc&risk=critical,high")
    assert order == [ids[4], ids[1], ids[2]]
    assert [s["field"] for s in data["sort"]] == ["risk", "distance_office"]
    garbage, _ = _ids(client, officer, "category=garbage&sort=priority:desc")
    assert garbage == [ids[1], ids[3]]


def test_sorting_is_correct_across_pages(client, seeded):
    officer, ids = seeded
    full, _ = _ids(client, officer, "sort=risk:desc,priority:desc&per_page=50")
    paged = []
    for page in (1, 2, 3):
        part, data = _ids(client, officer, f"sort=risk:desc,priority:desc&per_page=2&page={page}")
        paged += part
    assert paged == full and data["pages"] == 3


def test_overdue_sorting_and_filter(client, seeded):
    from datetime import timedelta

    from app.extensions import utcnow

    officer, ids = seeded
    _set(ids[3], sla_due_at=utcnow() - timedelta(hours=10))
    _set(ids[0], sla_due_at=utcnow() - timedelta(hours=2))
    order, _ = _ids(client, officer, "sort=overdue:desc,priority:desc")
    assert order[:2] == [ids[3], ids[0]]
    only, _ = _ids(client, officer, "overdue=true")
    assert set(only) == {ids[3], ids[0]}


def test_invalid_sort_rejected(client, seeded):
    officer, _ = seeded
    assert client.get("/api/municipal/complaints?sort=drop_table:asc", headers=auth(officer)).status_code == 422
    assert client.get("/api/municipal/complaints?sort=risk:sideways", headers=auth(officer)).status_code == 422
    assert client.get("/api/municipal/complaints?risk=extreme", headers=auth(officer)).status_code == 422


def test_related_report_counts_are_real_and_unique(client, app):
    officer, _ = create_staff(app, client)
    a_token, _ = register(client)
    b_token, _ = register(client)
    _, first = new_complaint(client, a_token)
    new_complaint(client, a_token, latitude=str(CENTER[0] + 0.0003))   # same citizen again
    _, third = new_complaint(client, b_token, latitude=str(CENTER[0] + 0.0005))
    data = client.get(f"/api/municipal/complaints/{third['id']}", headers=auth(officer)).get_json()["complaint"]
    assert data["related_count"] == 2      # every other record is counted as related...
    assert data["report_count"] == 2       # ...but the repeat citizen counts once
    assert Complaint.query.count() == 3    # no original complaint was discarded
    first_now = client.get(f"/api/municipal/complaints/{first['id']}", headers=auth(officer)).get_json()["complaint"]
    assert first_now["related_count"] == 2
