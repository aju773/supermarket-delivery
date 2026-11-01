"""Shop Settings and Delivery Areas through the admin API, and the public list of active Delivery Areas."""

import pytest
from django.contrib.auth.models import User
from django.test import Client

from shop.models import DeliveryArea

pytestmark = pytest.mark.django_db

VALID_SETTINGS = {
    "minimum_order_paise": 25000,
    "delivery_charge_paise": 3050,
    "opening_time": "07:30",
    "closing_time": "22:00",
    "phone": "080 2345 6789",
    "orders_per_hour_limit": 5,
}


@pytest.fixture
def staff():
    """A logged-in Staff Member's browser, enforcing CSRF like a real one."""
    User.objects.create_user(username="priya", password="correct horse battery")
    client = Client(enforce_csrf_checks=True)
    client.get("/api/admin/auth/csrf")
    send(client, "post", "/api/admin/auth/login", {"username": "priya", "password": "correct horse battery"})
    return client


def send(client, method, path, data=None):
    return getattr(client, method)(
        path,
        data=data or {},
        content_type="application/json",
        headers={"X-CSRFToken": client.cookies["csrftoken"].value},
    )


def add_area(client, name):
    response = send(client, "post", "/api/admin/delivery-areas", {"name": name})
    assert response.status_code == 201
    return response.json()


def area_names(client):
    return [(area["name"], area["is_active"]) for area in client.get("/api/admin/delivery-areas").json()]


def test_staff_reads_the_default_settings(staff):
    response = staff.get("/api/admin/settings")

    assert response.status_code == 200
    assert response.json() == {
        "minimum_order_paise": 20000,
        "delivery_charge_paise": 2000,
        "opening_time": "08:00",
        "closing_time": "21:00",
        "phone": "",
        "orders_per_hour_limit": 3,
    }


def test_staff_updates_settings_and_the_shop_info_shows_them(staff):
    response = send(staff, "put", "/api/admin/settings", VALID_SETTINGS)

    assert response.status_code == 200
    assert response.json() == VALID_SETTINGS
    assert staff.get("/api/admin/settings").json() == VALID_SETTINGS
    info = Client().get("/api/shop").json()
    assert info["minimum_order_paise"] == 25000
    assert info["opening_time"] == "07:30"
    assert info["closing_time"] == "22:00"
    assert info["phone"] == "080 2345 6789"


@pytest.mark.parametrize(
    ("changes", "errors"),
    [
        ({"minimum_order_paise": -1}, {"minimum_order_paise": "Can't be negative."}),
        ({"delivery_charge_paise": -100}, {"delivery_charge_paise": "Can't be negative."}),
        ({"closing_time": "07:30"}, {"closing_time": "Must be after the opening time."}),
        ({"closing_time": "06:00"}, {"closing_time": "Must be after the opening time."}),
        ({"phone": "   "}, {"phone": "Enter the shop phone number."}),
        ({"orders_per_hour_limit": 0}, {"orders_per_hour_limit": "Must be at least 1."}),
        (
            {"minimum_order_paise": -1, "phone": ""},
            {"minimum_order_paise": "Can't be negative.", "phone": "Enter the shop phone number."},
        ),
    ],
)
def test_invalid_settings_are_rejected_with_field_errors(staff, changes, errors):
    response = send(staff, "put", "/api/admin/settings", VALID_SETTINGS | changes)

    assert response.status_code == 400
    assert response.json()["errors"] == errors
    assert staff.get("/api/admin/settings").json()["phone"] == ""


def test_phone_is_saved_without_surrounding_spaces(staff):
    response = send(staff, "put", "/api/admin/settings", VALID_SETTINGS | {"phone": "  98450 12345 "})

    assert response.json()["phone"] == "98450 12345"


def test_staff_adds_areas_in_display_order(staff):
    add_area(staff, "Gandhi Nagar")
    add_area(staff, "Lake View Colony")

    areas = staff.get("/api/admin/delivery-areas").json()
    assert [(area["name"], area["is_active"]) for area in areas] == [
        ("Gandhi Nagar", True),
        ("Lake View Colony", True),
    ]
    assert all(isinstance(area["id"], int) for area in areas)


def test_area_names_must_be_filled_in_and_unique(staff):
    add_area(staff, "Gandhi Nagar")

    assert send(staff, "post", "/api/admin/delivery-areas", {"name": " "}).json()["errors"] == {
        "name": "Enter the area name."
    }
    assert send(staff, "post", "/api/admin/delivery-areas", {"name": "gandhi nagar "}).json()["errors"] == {
        "name": "There is already an area with this name."
    }


def test_staff_renames_an_area(staff):
    area = add_area(staff, "Station Rd")

    response = send(staff, "patch", f"/api/admin/delivery-areas/{area['id']}", {"name": "Station Road"})

    assert response.status_code == 200
    assert response.json()["name"] == "Station Road"
    assert area_names(staff) == [("Station Road", True)]


def test_renaming_to_another_areas_name_is_rejected(staff):
    add_area(staff, "Gandhi Nagar")
    area = add_area(staff, "Station Road")

    response = send(staff, "patch", f"/api/admin/delivery-areas/{area['id']}", {"name": "Gandhi Nagar"})

    assert response.status_code == 400
    assert response.json()["errors"] == {"name": "There is already an area with this name."}


def test_disabling_an_area_keeps_it(staff):
    area = add_area(staff, "Old Market")

    response = send(staff, "patch", f"/api/admin/delivery-areas/{area['id']}", {"is_active": False})

    assert response.status_code == 200
    assert area_names(staff) == [("Old Market", False)]
    assert DeliveryArea.objects.filter(name="Old Market").exists()


def test_staff_reorders_areas(staff):
    ids = [add_area(staff, name)["id"] for name in ["A", "B", "C"]]

    response = send(staff, "put", "/api/admin/delivery-areas/order", {"ids": [ids[2], ids[0], ids[1]]})

    assert response.status_code == 200
    assert [area["name"] for area in response.json()] == ["C", "A", "B"]
    assert area_names(staff) == [("C", True), ("A", True), ("B", True)]


def test_reorder_must_list_every_area_once(staff):
    ids = [add_area(staff, name)["id"] for name in ["A", "B"]]

    for bad in ([ids[0]], [ids[0], ids[0]], [ids[0], ids[1], 9999]):
        response = send(staff, "put", "/api/admin/delivery-areas/order", {"ids": bad})
        assert response.status_code == 400
    assert [name for name, _ in area_names(staff)] == ["A", "B"]


def test_unknown_area_is_not_found(staff):
    assert send(staff, "patch", "/api/admin/delivery-areas/9999", {"name": "X"}).status_code == 404


def test_public_list_has_only_active_areas_in_display_order(staff):
    ids = [add_area(staff, name)["id"] for name in ["Gandhi Nagar", "Old Market", "Temple Street"]]
    send(staff, "put", "/api/admin/delivery-areas/order", {"ids": [ids[2], ids[1], ids[0]]})
    send(staff, "patch", f"/api/admin/delivery-areas/{ids[1]}", {"is_active": False})

    response = Client().get("/api/shop/delivery-areas")

    assert response.status_code == 200
    assert response.json() == [
        {"id": ids[2], "name": "Temple Street"},
        {"id": ids[0], "name": "Gandhi Nagar"},
    ]


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("get", "/api/admin/settings"),
        ("put", "/api/admin/settings"),
        ("get", "/api/admin/delivery-areas"),
        ("post", "/api/admin/delivery-areas"),
        ("patch", "/api/admin/delivery-areas/1"),
        ("put", "/api/admin/delivery-areas/order"),
    ],
)
def test_anonymous_visitors_are_rejected(method, path):
    client = Client()
    response = getattr(client, method)(path, data=VALID_SETTINGS, content_type="application/json")

    assert response.status_code == 401


def test_writes_without_the_csrf_token_are_rejected(staff):
    response = staff.put("/api/admin/settings", data=VALID_SETTINGS, content_type="application/json")

    assert response.status_code == 403
