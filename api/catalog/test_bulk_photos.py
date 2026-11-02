"""Bulk photo upload through the admin API: files (or a zip) matched to Pack Options by file name = code."""

import zipfile
from io import BytesIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from catalog import bulk_photos, photos
from catalog.models import Category, PackOption, Product

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def media(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    return tmp_path


@pytest.fixture
def catalog():
    vegetables = Category.objects.create(name="Vegetables")
    tomato = Product.objects.create(name="Tomato", category=vegetables)
    onion = Product.objects.create(name="Onion", category=vegetables)
    PackOption.objects.create(product=tomato, code="200000000028", label="500 g", price_paise=2400)
    PackOption.objects.create(product=tomato, code="200000000035", label="1 kg", price_paise=4500, position=1)
    PackOption.objects.create(product=onion, code="200000000014", label="1 kg", price_paise=3000)
    return tomato, onion


def image_bytes(width=400, height=300, fmt="JPEG"):
    buffer = BytesIO()
    Image.new("RGB", (width, height), "red").save(buffer, fmt)
    return buffer.getvalue()


def picture(name, width=400, height=300, fmt="JPEG"):
    return SimpleUploadedFile(name, image_bytes(width, height, fmt), content_type="application/octet-stream")


def zip_of(files, name="photos.zip"):
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        for entry, content in files.items():
            archive.writestr(entry, content)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="application/zip")


def upload(client, *files):
    return client.post(
        "/api/admin/import/photos",
        {"files": list(files)},
        headers={"X-CSRFToken": client.cookies["csrftoken"].value},
    )


def stored(media, url):
    assert url.startswith("/media/")
    return Image.open(media / url.removeprefix("/media/"))


def test_photos_need_a_staff_session(client):
    assert client.post("/api/admin/import/photos").status_code == 401


def test_files_are_matched_to_the_product_by_pack_option_code(staff, catalog):
    tomato, onion = catalog

    response = upload(staff, picture("200000000028.jpg"), picture("200000000014.png", fmt="PNG"))

    assert response.status_code == 200, response.json()
    result = response.json()
    assert result["unmatched"] == []
    assert [(each["filename"], each["code"], each["product"], each["pack_label"]) for each in result["matched"]] == [
        ("200000000028.jpg", "200000000028", "Tomato", "500 g"),
        ("200000000014.png", "200000000014", "Onion", "1 kg"),
    ]
    tomato.refresh_from_db()
    onion.refresh_from_db()
    assert tomato.photo and tomato.thumbnail
    assert onion.photo and onion.thumbnail
    assert result["matched"][0]["thumbnail_url"] == tomato.thumbnail.url


def test_stored_photos_are_resized_webp_like_single_uploads(staff, catalog, media):
    tomato, _ = catalog

    upload(staff, picture("200000000028.jpg", 4000, 3000))

    tomato.refresh_from_db()
    full, thumbnail = stored(media, tomato.photo.url), stored(media, tomato.thumbnail.url)
    assert full.format == thumbnail.format == "WEBP"
    assert full.size == (photos.FULL_SIZE, photos.FULL_SIZE * 3 // 4)
    assert thumbnail.size == (photos.THUMBNAIL_SIZE, photos.THUMBNAIL_SIZE * 3 // 4)


def test_files_that_match_no_code_are_reported_and_save_nothing(staff, catalog):
    tomato, _ = catalog

    result = upload(staff, picture("IMG_2041.jpg"), picture("200000000028.jpg")).json()

    assert result["unmatched"] == [{"filename": "IMG_2041.jpg", "reason": bulk_photos.NO_MATCH}]
    assert [each["code"] for each in result["matched"]] == ["200000000028"]
    assert Product.objects.exclude(pk=tomato.pk).filter(photo="").count() == 1


def test_a_photo_replaces_the_products_existing_one(staff, catalog, media):
    tomato, _ = catalog
    first = upload(staff, picture("200000000028.jpg", 800, 800)).json()["matched"][0]
    second = upload(staff, picture("200000000035.jpg", 600, 300)).json()["matched"][0]

    tomato.refresh_from_db()
    assert second["thumbnail_url"] == tomato.thumbnail.url
    assert not (media / first["thumbnail_url"].removeprefix("/media/")).exists()
    assert stored(media, tomato.photo.url).size == (600, 300)


def test_non_images_are_reported_and_not_saved(staff, catalog):
    tomato, _ = catalog

    result = upload(
        staff,
        SimpleUploadedFile("200000000028.jpg", b"not really a photo"),
        SimpleUploadedFile("notes.txt", b"hello"),
    ).json()

    assert result["matched"] == []
    assert result["unmatched"] == [
        {"filename": "200000000028.jpg", "reason": photos.NOT_AN_IMAGE},
        {"filename": "notes.txt", "reason": bulk_photos.NO_MATCH},
    ]
    tomato.refresh_from_db()
    assert not tomato.photo


def test_oversized_photos_are_reported(staff, catalog, monkeypatch):
    monkeypatch.setattr(photos, "MAX_UPLOAD_BYTES", 1000)

    result = upload(staff, picture("200000000028.jpg", 800, 800)).json()

    assert result["matched"] == []
    assert result["unmatched"] == [{"filename": "200000000028.jpg", "reason": photos.TOO_LARGE}]


def test_a_zip_is_unpacked_and_its_photos_matched(staff, catalog):
    tomato, onion = catalog

    result = upload(
        staff,
        zip_of(
            {
                "200000000028.jpg": image_bytes(),
                "shelf photos/200000000014.PNG": image_bytes(fmt="PNG"),
                "IMG_9.jpg": image_bytes(),
                "readme.txt": b"hello",
                "__MACOSX/._200000000028.jpg": b"junk",
                ".DS_Store": b"junk",
            }
        ),
    ).json()

    assert sorted(each["filename"] for each in result["matched"]) == ["200000000014.PNG", "200000000028.jpg"]
    assert sorted(each["filename"] for each in result["unmatched"]) == ["IMG_9.jpg", "readme.txt"]
    tomato.refresh_from_db()
    onion.refresh_from_db()
    assert tomato.photo and onion.photo


def test_a_zip_and_loose_files_can_be_sent_together(staff, catalog):
    result = upload(staff, zip_of({"200000000028.jpg": image_bytes()}), picture("200000000014.jpg")).json()

    assert len(result["matched"]) == 2


def test_a_broken_zip_is_reported_as_a_file_that_is_not_a_photo(staff, catalog):
    result = upload(staff, SimpleUploadedFile("photos.zip", b"PK\x03\x04 broken")).json()

    assert result["matched"] == []
    assert result["unmatched"] == [{"filename": "photos.zip", "reason": bulk_photos.BROKEN_ZIP}]


def test_zip_entries_over_the_size_limit_are_not_unpacked(staff, catalog, monkeypatch):
    monkeypatch.setattr(photos, "MAX_UPLOAD_BYTES", 1000)

    result = upload(staff, zip_of({"200000000028.jpg": image_bytes(800, 800)})).json()

    assert result["matched"] == []
    assert result["unmatched"] == [{"filename": "200000000028.jpg", "reason": photos.TOO_LARGE}]


def test_a_file_name_with_dots_keeps_everything_before_the_extension(staff, catalog):
    PackOption.objects.create(product=catalog[0], code="TOM.2", label="2 kg", price_paise=9000, position=2)

    result = upload(staff, picture("TOM.2.jpg")).json()

    assert [each["code"] for each in result["matched"]] == ["TOM.2"]


def test_two_files_for_one_product_keep_the_later_and_report_the_earlier(staff, catalog, media):
    tomato, _ = catalog

    result = upload(staff, picture("200000000028.jpg", 800, 800), picture("200000000035.jpg", 600, 300)).json()

    assert [each["code"] for each in result["matched"]] == ["200000000035"]
    assert result["unmatched"] == [
        {"filename": "200000000028.jpg", "reason": bulk_photos.REPLACED.format("200000000035.jpg")}
    ]
    tomato.refresh_from_db()
    assert result["matched"][0]["thumbnail_url"] == tomato.thumbnail.url
    assert stored(media, tomato.thumbnail.url).size == (photos.THUMBNAIL_SIZE, photos.THUMBNAIL_SIZE // 2)


def test_a_damaged_zip_entry_fails_alone(staff, catalog):
    good, bad = image_bytes(), image_bytes(300, 300)
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_STORED) as archive:
        archive.writestr("200000000028.jpg", good)
        archive.writestr("200000000014.jpg", bad)
    data = bytearray(buffer.getvalue())
    at = data.find(bad) + len(bad) // 2
    data[at] ^= 0xFF

    result = upload(staff, SimpleUploadedFile("photos.zip", bytes(data))).json()

    assert [each["code"] for each in result["matched"]] == ["200000000028"]
    assert result["unmatched"] == [{"filename": "200000000014.jpg", "reason": bulk_photos.BROKEN_ENTRY}]


def test_windows_style_folder_paths_in_a_zip_are_ignored(staff, catalog):
    result = upload(staff, zip_of({"shelf\\200000000028.jpg": image_bytes()})).json()

    assert [each["filename"] for each in result["matched"]] == ["200000000028.jpg"]
