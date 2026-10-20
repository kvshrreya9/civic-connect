import os

import pytest

from app.extensions import db
from app.models import ComplaintImage, StoredImage
from app.services import image_storage_service
from tests.conftest import make_image_bytes, new_complaint


@pytest.fixture
def db_storage(app):
    app.config["IMAGE_STORAGE"] = "database"
    return app


def test_photo_is_stored_in_database_and_served(db_storage, client):
    _, complaint = new_complaint(client, images=[make_image_bytes()])
    record = ComplaintImage.query.first()
    assert db.session.get(StoredImage, record.filename) is not None
    on_disk = os.path.join(db_storage.config["UPLOAD_FOLDER"], *record.filename.split("/"))
    assert not os.path.exists(on_disk)
    response = client.get(complaint["images"][0]["url"])
    assert response.status_code == 200
    assert response.mimetype == "image/jpeg"
    assert response.data[:2] == b"\xff\xd8"
    assert record.size_bytes == len(response.data)


def test_delete_removes_the_database_copy(db_storage, client):
    new_complaint(client, images=[make_image_bytes()])
    record = ComplaintImage.query.first()
    assert image_storage_service.delete_file(record.filename) is True
    assert db.session.get(StoredImage, record.filename) is None
    assert image_storage_service.read_bytes(record.filename) is None


def test_disk_storage_still_works_by_default(app, client):
    new_complaint(client, images=[make_image_bytes()])
    record = ComplaintImage.query.first()
    assert db.session.get(StoredImage, record.filename) is None
    assert image_storage_service.read_bytes(record.filename)[:2] == b"\xff\xd8"
