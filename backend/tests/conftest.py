import io
import uuid

import pytest
from PIL import Image, ImageDraw

from app import create_app
from app.config import TestingConfig
from app.extensions import db as _db
from app.models import Office, User, Ward
from app.services.department_routing_service import ensure_default_departments

CENTER = (13.0827, 80.2707)
BETA_CENTER = (13.2827, 80.2707)  # ~22 km north, separate jurisdiction


@pytest.fixture
def app(tmp_path):
    class Cfg(TestingConfig):
        UPLOAD_FOLDER = str(tmp_path / "uploads")

    application = create_app(Cfg)
    with application.app_context():
        _db.create_all()
        ensure_default_departments()
        alpha = Office(code="ALPHA", name="Alpha Municipality", office_type="municipality",
                       latitude=CENTER[0], longitude=CENTER[1])
        beta = Office(code="BETA", name="Beta Panchayat", office_type="panchayat",
                      latitude=BETA_CENTER[0], longitude=BETA_CENTER[1])
        _db.session.add_all([alpha, beta])
        _db.session.flush()
        _db.session.add_all([
            Ward(office=alpha, code="A1", name="Alpha Ward 1", boundary_type="circle",
                 center_lat=CENTER[0], center_lng=CENTER[1], radius_m=3000),
            Ward(office=beta, code="B1", name="Beta Ward", boundary_type="circle",
                 center_lat=BETA_CENTER[0], center_lng=BETA_CENTER[1], radius_m=3000),
        ])
        _db.session.commit()
        yield application
        _db.session.remove()
        _db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def make_image_bytes(color=(200, 60, 60), size=(320, 240), pattern=0, fmt="JPEG"):
    image = Image.new("RGB", size, color)
    draw = ImageDraw.Draw(image)
    for i in range(6):
        offset = (i * 40 + pattern * 17) % size[0]
        draw.rectangle([offset, 20 + i * 30, offset + 30, 40 + i * 30], fill=(20 + i * 30, 255 - i * 30, 90))
    buffer = io.BytesIO()
    image.save(buffer, fmt)
    buffer.seek(0)
    return buffer


def register(client, email=None, name="Test Citizen", password="Password123"):
    email = email or f"user-{uuid.uuid4().hex[:8]}@example.com"
    response = client.post("/api/auth/register", json={"name": name, "email": email, "password": password})
    assert response.status_code == 201, response.get_json()
    return response.get_json()["access_token"], response.get_json()["user"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def create_staff(app, client, office_code="ALPHA", role="officer", email=None, password="Password123", department_code=None):
    """Creates a staff user directly (as an administrator would) and logs in via the municipal portal."""
    from app.models import Department

    email = email or f"staff-{uuid.uuid4().hex[:8]}@example.com"
    office = Office.query.filter_by(code=office_code).first() if office_code and role != "admin" else None
    department = Department.query.filter_by(code=department_code).first() if department_code else None
    user = User(name=f"{role.title()} Member", email=email, role=role, office=office, department=department)
    user.set_password(password)
    _db.session.add(user)
    _db.session.commit()
    response = client.post("/api/auth/municipal/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.get_json()
    return response.get_json()["access_token"], user


def complaint_form(**overrides):
    data = {
        "title": "Large pothole near market",
        "description": "There is a large pothole near the market entrance causing accidents.",
        "category": "pothole",
        "severity": "high",
        "safety_risk": "true",
        "affected_count": "50",
        "latitude": str(CENTER[0]),
        "longitude": str(CENTER[1]),
        "address": "Market Road, Test City",
    }
    data.update(overrides)
    return data


def submit_complaint(client, token, images=None, headers=None, **overrides):
    data = complaint_form(**overrides)
    if images:
        data["images"] = [(img, f"photo{i}.jpg") for i, img in enumerate(images)]
    h = auth(token)
    if headers:
        h.update(headers)
    return client.post("/api/complaints", data=data, headers=h, content_type="multipart/form-data")


def new_complaint(client, token=None, **overrides):
    if token is None:
        token, _ = register(client)
    response = submit_complaint(client, token, **overrides)
    assert response.status_code == 201, response.get_json()
    return token, response.get_json()["complaint"]


def assign_to_worker(client, officer_token, complaint_id, worker_id):
    response = client.post(f"/api/municipal/complaints/{complaint_id}/assign",
                           json={"worker_id": worker_id, "note": "Please attend"}, headers=auth(officer_token))
    assert response.status_code == 200, response.get_json()
    return response.get_json()["complaint"]


def upload_resolution(client, worker_token, complaint_id, headers=None, images=True):
    data = {"description": "Pothole filled with hot-mix asphalt and compacted."}
    if images:
        data["images"] = [(make_image_bytes(color=(40, 40, 40), pattern=3), "after.jpg")]
    h = auth(worker_token)
    if headers:
        h.update(headers)
    return client.post(f"/api/verification/{complaint_id}/proof", data=data, headers=h, content_type="multipart/form-data")
