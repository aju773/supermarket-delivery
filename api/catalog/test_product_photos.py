"""Product photos through the admin API: upload, replace, remove, and rejecting files that aren't usable photos."""

from io import BytesIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from catalog import photos
from catalog.models import Category, Product

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def media(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    return tmp_path


@pytest.fixture
def tomato():
    return Product.objects.create(name="Tomato", category=Category.objects.create(name="Vegetables"))


def jpeg(width, height, name="tomato.jpg"):
    buffer = BytesIO()
    Image.new("RGB", (width, height), "red").save(buffer, "JPEG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/jpeg")


def upload(client, product, file):
    return client.post(
        f"/api/admin/products/{product.id}/photo",
        {"photo": file},
        headers={"X-CSRFToken": client.cookies["csrftoken"].value},
    )


def stored(media, url):
    """The image a photo URL points at, opened from the media folder."""
    assert url.startswith("/media/")
    return Image.open(media / url.removeprefix("/media/"))


def test_new_products_have_no_photo(staff, tomato):
    item = staff.get(f"/api/admin/products/{tomato.id}").json()
    assert item["photo_url"] is None
    assert item["thumbnail_url"] is None


def test_upload_stores_a_resized_webp_photo_and_thumbnail(staff, tomato, media):
    response = upload(staff, tomato, jpeg(4000, 3000))

    assert response.status_code == 200, response.json()
    item = response.json()
    full = stored(media, item["photo_url"])
    thumbnail = stored(media, item["thumbnail_url"])
    assert full.format == thumbnail.format == "WEBP"
    assert full.size == (photos.FULL_SIZE, photos.FULL_SIZE * 3 // 4)
    assert thumbnail.size == (photos.THUMBNAIL_SIZE, photos.THUMBNAIL_SIZE * 3 // 4)
    assert staff.get("/api/admin/products").json()["items"][0]["thumbnail_url"] == item["thumbnail_url"]


def test_small_photos_are_not_enlarged(staff, tomato, media):
    item = upload(staff, tomato, jpeg(200, 100)).json()

    assert stored(media, item["photo_url"]).size == (200, 100)
    assert stored(media, item["thumbnail_url"]).size == (200, 100)


def test_replacing_a_photo_swaps_it_and_deletes_the_old_files(staff, tomato, media):
    first = upload(staff, tomato, jpeg(800, 800)).json()
    second = upload(staff, tomato, jpeg(600, 300)).json()

    assert second["photo_url"] != first["photo_url"]
    assert stored(media, second["photo_url"]).size == (600, 300)
    assert not (media / first["photo_url"].removeprefix("/media/")).exists()
    assert not (media / first["thumbnail_url"].removeprefix("/media/")).exists()


def test_removing_a_photo_brings_back_the_placeholder(staff, tomato, media):
    item = upload(staff, tomato, jpeg(800, 800)).json()

    response = staff.delete(
        f"/api/admin/products/{tomato.id}/photo", headers={"X-CSRFToken": staff.cookies["csrftoken"].value}
    )

    assert response.status_code == 200
    assert response.json()["photo_url"] is None
    assert not (media / item["photo_url"].removeprefix("/media/")).exists()


def test_non_images_are_rejected(staff, tomato):
    response = upload(staff, tomato, SimpleUploadedFile("notes.jpg", b"not really a photo", content_type="image/jpeg"))

    assert response.status_code == 400
    assert response.json()["detail"] == photos.NOT_AN_IMAGE
    tomato.refresh_from_db()
    assert not tomato.photo


def test_oversized_uploads_are_rejected(staff, tomato, settings, monkeypatch):
    monkeypatch.setattr(photos, "MAX_UPLOAD_BYTES", 1000)

    response = upload(staff, tomato, jpeg(800, 800))

    assert response.status_code == 400
    assert response.json()["detail"] == photos.TOO_LARGE


def test_photos_need_a_staff_session(client, tomato):
    response = client.post(f"/api/admin/products/{tomato.id}/photo", {"photo": jpeg(10, 10)})
    assert response.status_code == 401
