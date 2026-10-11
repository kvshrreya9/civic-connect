from app.services.duplicate_service import text_similarity
from tests.conftest import CENTER, auth, make_image_bytes, register, submit_complaint


def test_text_similarity_orders_sensibly():
    a = "Large pothole near the market entrance causing accidents"
    assert text_similarity(a, "Big pothole at market entrance, accidents happening") > text_similarity(a, "Streetlight not working at night")


def test_duplicate_warning_but_report_saved(client):
    first_token, _ = register(client)
    second_token, _ = register(client)
    submit_complaint(client, first_token, images=[make_image_bytes()])
    response = submit_complaint(
        client, second_token, images=[make_image_bytes()],
        latitude=str(CENTER[0] + 0.0002), title="Pothole near market entrance",
    )
    assert response.status_code == 201
    body = response.get_json()
    assert body["complaint"]["id"]
    assert body["complaint"]["possible_duplicate"] is True
    assert body["duplicates"] and body["duplicates"][0]["image_similarity"] > 0.9


def test_precheck_endpoint(client):
    token, _ = register(client)
    submit_complaint(client, token)
    response = client.post(
        "/api/duplicates/check",
        json={"latitude": CENTER[0], "longitude": CENTER[1], "category": "pothole",
              "description": "Large pothole near market entrance causing accidents"},
        headers=auth(token),
    )
    assert response.status_code == 200
    assert len(response.get_json()["candidates"]) == 1


def test_different_category_not_duplicate(client):
    token, _ = register(client)
    submit_complaint(client, token)
    response = client.post(
        "/api/duplicates/check",
        json={"latitude": CENTER[0], "longitude": CENTER[1], "category": "streetlight", "description": "Light broken"},
        headers=auth(token),
    )
    assert response.get_json()["candidates"] == []


def test_far_away_not_duplicate(client):
    token, _ = register(client)
    submit_complaint(client, token)
    response = client.post(
        "/api/duplicates/check",
        json={"latitude": CENTER[0] + 0.01, "longitude": CENTER[1], "category": "pothole",
              "description": "Large pothole near market entrance causing accidents"},
        headers=auth(token),
    )
    assert response.get_json()["candidates"] == []
