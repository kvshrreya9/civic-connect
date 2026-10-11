import io
import os

from PIL import Image

from app.models import ComplaintImage
from tests.conftest import auth, create_staff, make_image_bytes, new_complaint, register, submit_complaint


def _jpeg_with_gps():
    image = Image.new("RGB", (400, 300), (90, 120, 200))
    exif = Image.Exif()
    exif[0x010F] = "SecretCameraMaker"
    exif[0x8825] = {1: "N", 2: (13.0, 5.0, 0.0), 3: "E", 4: (80.0, 16.0, 0.0)}
    buffer = io.BytesIO()
    image.save(buffer, "JPEG", exif=exif)
    buffer.seek(0)
    return buffer


def test_exif_and_gps_stripped(app, client):
    token, _ = register(client)
    assert submit_complaint(client, token, images=[_jpeg_with_gps()]).status_code == 201
    record = ComplaintImage.query.first()
    with Image.open(os.path.join(app.config["UPLOAD_FOLDER"], *record.filename.split("/"))) as stored:
        assert len(stored.getexif()) == 0 and "exif" not in stored.info


def test_large_images_are_downscaled(app, client):
    token, _ = register(client)
    big = io.BytesIO()
    Image.new("RGB", (4000, 3000), (10, 200, 10)).save(big, "PNG")
    big.seek(0)
    submit_complaint(client, token, images=[big])
    record = ComplaintImage.query.first()
    assert max(record.width, record.height) <= app.config["IMAGE_MAX_DIMENSION"]


def test_images_require_valid_signature(client):
    token, complaint = new_complaint(client, images=[make_image_bytes()])
    url = complaint["images"][0]["url"]
    assert client.get(url).status_code == 200
    bare = url.split("?")[0]
    assert client.get(bare).status_code == 403
    assert client.get(bare + "?t=forged-token").status_code == 403
    assert client.get("/api/images/..%2F..%2Fconfig.py").status_code == 404


def test_other_citizens_and_offices_get_no_photos(app, client):
    _, complaint = new_complaint(client, images=[make_image_bytes()])
    stranger, _ = register(client)
    view = client.get(f"/api/complaints/{complaint['id']}", headers=auth(stranger)).get_json()["complaint"]
    assert view["images"] == [] and view["reporter"]["name"] == "Verified citizen"
    beta, _ = create_staff(app, client, office_code="BETA")
    assert client.get(f"/api/complaints/{complaint['id']}", headers=auth(beta)).status_code == 404


def test_public_dashboard_has_no_personal_data(client):
    token, _ = register(client, email="private@example.com", name="Private Person")
    submit_complaint(client, token)
    raw = client.get("/api/dashboard/public").get_data(as_text=True)
    assert "private@example.com" not in raw and "Private Person" not in raw
