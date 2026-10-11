from app.extensions import db
from app.models import Complaint, Office, Ward
from app.services.department_routing_service import route
from app.services.jurisdiction_service import point_in_polygon, resolve
from tests.conftest import BETA_CENTER, CENTER, auth, create_staff, new_complaint, register


def test_categories_route_to_departments(app):
    assert route("pothole").code == "RDS"
    assert route("garbage").code == "SWM"
    assert route("unknown-category").code == "GEN"


def test_location_routes_to_correct_office(client):
    _, a = new_complaint(client)
    _, b = new_complaint(client, latitude=str(BETA_CENTER[0]), longitude=str(BETA_CENTER[1]))
    assert a["office"]["code"] == "ALPHA" and a["routing_status"] == "routed"
    assert b["office"]["code"] == "BETA" and b["ward"]["code"] == "B1"


def test_public_location_contact_returns_only_the_responsible_office_contact(app, client):
    office = Office.query.filter_by(code="ALPHA").first()
    office.contact_phone = "+91 44 1234 5678"
    office.critical_alert_phone = "+91 44 8765 4321"
    db.session.commit()

    response = client.get(f"/api/location/municipality-contact?lat={CENTER[0]}&lng={CENTER[1]}")
    assert response.status_code == 200
    data = response.get_json()
    assert data["office"]["code"] == "ALPHA"
    assert data["contact_phone"] == "+91 44 1234 5678"
    assert "critical_alert_phone" not in data
    assert "contact_phone" not in data["office"]

    unmapped = client.get("/api/location/municipality-contact?lat=12.5&lng=79.5").get_json()
    assert unmapped == {"office": None, "ward": None, "contact_phone": None}

    beta_contact = client.get(
        f"/api/location/municipality-contact?lat={BETA_CENTER[0]}&lng={BETA_CENTER[1]}"
    ).get_json()
    assert beta_contact["office"]["code"] == "BETA"
    assert beta_contact["contact_phone"] is None


def test_public_municipality_directory_lists_active_offices_without_private_fields(app, client):
    response = client.get("/api/location/offices")
    assert response.status_code == 200
    offices = response.get_json()["offices"]
    assert {office["name"] for office in offices} == {"Alpha Municipality", "Beta Panchayat"}
    assert all("contact_phone" not in office for office in offices)


def test_unmapped_location_goes_to_admin_queue(app, client):
    admin, _ = create_staff(app, client, role="admin")
    officer, _ = create_staff(app, client)
    _, complaint = new_complaint(client, latitude="12.5", longitude="79.5")
    assert complaint["office"] is None and complaint["routing_status"] == "unmapped"
    assert client.get("/api/municipal/complaints", headers=auth(officer)).get_json()["total"] == 0
    queue = client.get("/api/municipal/complaints?unrouted=true", headers=auth(admin)).get_json()
    assert [i["id"] for i in queue["items"]] == [complaint["id"]]
    admin_notes = client.get("/api/notifications", headers=auth(admin)).get_json()["items"]
    assert any(n["complaint_id"] == complaint["id"] for n in admin_notes)


def test_polygon_ward(app, client):
    square = [[12.40, 79.40], [12.40, 79.60], [12.60, 79.60], [12.60, 79.40]]
    assert point_in_polygon(12.5, 79.5, square) and not point_in_polygon(12.7, 79.5, square)
    polygon_with_hole = [square, [[12.45, 79.45], [12.45, 79.55], [12.55, 79.55], [12.55, 79.45]]]
    assert point_in_polygon(12.42, 79.42, polygon_with_hole)
    assert not point_in_polygon(12.5, 79.5, polygon_with_hole)
    admin, _ = create_staff(app, client, role="admin")
    office = client.post("/api/admin/offices", json={"name": "Gamma Panchayat", "code": "GAMMA",
                                                     "office_type": "panchayat", "latitude": 12.5, "longitude": 79.5},
                         headers=auth(admin)).get_json()["office"]
    ward = client.post("/api/admin/wards", json={"office_id": office["id"], "name": "Gamma Ward", "code": "G1",
                                                 "boundary_type": "polygon", "polygon": square}, headers=auth(admin))
    assert ward.status_code == 201
    ward_obj, office_obj = resolve(12.5, 79.5)
    assert office_obj.code == "GAMMA"


def test_reroute_unmapped_after_adding_ward(app, client):
    admin, _ = create_staff(app, client, role="admin")
    _, complaint = new_complaint(client, latitude="12.5", longitude="79.5")
    office = client.post("/api/admin/offices", json={"name": "Gamma Panchayat", "code": "GAMMA", "latitude": 12.5,
                                                     "longitude": 79.5}, headers=auth(admin)).get_json()["office"]
    client.post("/api/admin/wards", json={"office_id": office["id"], "name": "Gamma Ward", "code": "G1",
                                          "center_lat": 12.5, "center_lng": 79.5, "radius_m": 2000}, headers=auth(admin))
    assert client.post("/api/admin/routing/reroute-unmapped", headers=auth(admin)).get_json()["routed"] == 1
    assert db.session.get(Complaint, complaint["id"]).office.code == "GAMMA"


def test_office_transfer_with_audit_and_notification(app, client):
    _, complaint = new_complaint(client)
    alpha, _ = create_staff(app, client)
    beta, _ = create_staff(app, client, office_code="BETA")
    beta_office = Office.query.filter_by(code="BETA").first()
    response = client.post(f"/api/municipal/complaints/{complaint['id']}/transfer",
                           json={"office_id": beta_office.id, "note": "Outside our boundary"}, headers=auth(alpha))
    assert response.status_code == 200 and response.get_json()["complaint"]["office"]["code"] == "BETA"
    assert client.get(f"/api/municipal/complaints/{complaint['id']}", headers=auth(beta)).status_code == 200
    assert client.get(f"/api/municipal/complaints/{complaint['id']}", headers=auth(alpha)).status_code == 404
    notes = client.get("/api/notifications", headers=auth(beta)).get_json()["items"]
    assert any(n["type"] == "reassigned" for n in notes)
    activity = client.get(f"/api/municipal/complaints/{complaint['id']}/activity", headers=auth(beta)).get_json()
    assert any(a["action"] == "complaint.office_transferred" for a in activity["audit"])


def test_admin_routing_test_endpoint(app, client):
    admin, _ = create_staff(app, client, role="admin")
    data = client.get(f"/api/admin/routing/test?lat={CENTER[0]}&lng={CENTER[1]}", headers=auth(admin)).get_json()
    assert data["office"]["code"] == "ALPHA"


def test_admin_can_configure_a_per_office_critical_alert_phone(app, client):
    admin, _ = create_staff(app, client, role="admin")
    office = Office.query.filter_by(code="ALPHA").first()
    response = client.put(
        f"/api/admin/offices/{office.id}",
        json={"critical_alert_phone": "+919876543210"},
        headers=auth(admin),
    )
    assert response.status_code == 200
    assert response.get_json()["office"]["critical_alert_phone"] == "+919876543210"

    invalid = client.put(
        f"/api/admin/offices/{office.id}",
        json={"critical_alert_phone": "call-me"},
        headers=auth(admin),
    )
    assert invalid.status_code == 422


def test_ward_scoped_officer(app, client):
    _, complaint = new_complaint(client)
    alpha = Office.query.filter_by(code="ALPHA").first()
    other = Ward(office=alpha, code="A9", name="Far ward", center_lat=0.5, center_lng=0.5, radius_m=10)
    db.session.add(other)
    db.session.commit()
    token, user = create_staff(app, client)
    user.ward_id = other.id
    db.session.commit()
    assert client.get(f"/api/municipal/complaints/{complaint['id']}", headers=auth(token)).status_code == 404


def test_citizen_cannot_manage_offices(client):
    token, _ = register(client)
    assert client.post("/api/admin/offices", json={"name": "X", "code": "XX"}, headers=auth(token)).status_code == 403
