from app.services.location_service import bounding_box, haversine_m
from tests.conftest import CENTER, register, submit_complaint


def test_haversine_known_distance():
    distance = haversine_m(13.0827, 80.2707, 13.0827, 80.2807)
    assert 1070 < distance < 1090


def test_bounding_box_contains_point():
    min_lat, max_lat, min_lng, max_lng = bounding_box(13.0, 80.0, 1000)
    assert min_lat < 13.0 < max_lat and min_lng < 80.0 < max_lng


def test_reverse_geocode_fallback_when_disabled(client):
    response = client.get("/api/location/reverse?lat=13.08&lng=80.27")
    assert response.status_code == 200
    assert response.get_json()["source"] == "coordinates"


def test_reverse_geocode_validates_coordinates(client):
    assert client.get("/api/location/reverse?lat=abc&lng=80").status_code == 422


def test_nearby_endpoint_returns_within_radius(client):
    token, _ = register(client)
    submit_complaint(client, token)
    submit_complaint(client, token, latitude=str(CENTER[0] + 0.05), title="Far away pothole issue")
    data = client.get(f"/api/location/nearby?lat={CENTER[0]}&lng={CENTER[1]}&radius=500").get_json()
    assert len(data["items"]) == 1
    assert data["items"][0]["distance_m"] < 1


def test_address_autofilled_from_geocoder_fallback(client):
    token, _ = register(client)
    complaint = submit_complaint(client, token, address="").get_json()["complaint"]
    assert complaint["address"].startswith("Near ")
