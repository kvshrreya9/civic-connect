from app.services.priority_service import compute_score
from tests.conftest import CENTER, register, submit_complaint


def _score(**kw):
    base = dict(severity="medium", safety_risk=False, affected_count=1, support_count=0,
                nearby_count=0, hours_open=0, sla_hours=72)
    base.update(kw)
    return compute_score(**base)


def test_score_bounds_and_breakdown(app):
    low, breakdown = _score(severity="low")
    high, _ = _score(severity="critical", safety_risk=True, affected_count=10000, nearby_count=10, hours_open=500)
    assert 0 <= low < high <= 100
    assert high == 100
    assert sum(f["points"] for f in breakdown["factors"]) == low
    assert {f["key"] for f in breakdown["factors"]} == {"severity", "safety", "affected", "nearby", "time"}


def test_each_factor_increases_score(app):
    base, _ = _score()
    assert _score(severity="high")[0] > base
    assert _score(safety_risk=True)[0] > base
    assert _score(affected_count=100)[0] > base
    assert _score(nearby_count=2)[0] > base
    assert _score(hours_open=60)[0] > base


def test_nearby_reports_raise_priority(client):
    token, _ = register(client)
    first = submit_complaint(client, token).get_json()["complaint"]
    second = submit_complaint(client, token, latitude=str(CENTER[0] + 0.001)).get_json()["complaint"]
    nearby_factor = next(f for f in second["priority_breakdown"]["factors"] if f["key"] == "nearby")
    assert nearby_factor["points"] >= 5
    assert second["priority_score"] >= first["priority_score"]


def test_preview_endpoint(client):
    response = client.post("/api/priority/preview", json={"severity": "critical", "safety_risk": True, "affected_count": 100})
    body = response.get_json()
    assert response.status_code == 200 and body["score"] >= 70
