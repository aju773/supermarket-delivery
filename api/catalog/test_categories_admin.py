"""Categories through the admin API: add, rename, reorder, hide and unhide."""

import pytest
from django.contrib.auth.models import User
from django.test import Client

pytestmark = pytest.mark.django_db


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


def add_category(client, name):
    response = send(client, "post", "/api/admin/categories", {"name": name})
    assert response.status_code == 201
    return response.json()


def category_names(client):
    return [(category["name"], category["is_visible"]) for category in client.get("/api/admin/categories").json()["items"]]


def test_staff_adds_categories_in_display_order(staff):
    vegetables = add_category(staff, "  Vegetables ")
    add_category(staff, "Fruits")

    assert vegetables == {"id": vegetables["id"], "name": "Vegetables", "is_visible": True}
    assert category_names(staff) == [("Vegetables", True), ("Fruits", True)]


def test_category_names_must_be_filled_in_and_unique(staff):
    add_category(staff, "Snacks")

    blank = send(staff, "post", "/api/admin/categories", {"name": "  "})
    duplicate = send(staff, "post", "/api/admin/categories", {"name": "SNACKS"})

    assert blank.status_code == 400
    assert blank.json()["errors"] == {"name": "Enter the category name."}
    assert duplicate.status_code == 400
    assert duplicate.json()["errors"] == {"name": "There is already a category with this name."}


def test_staff_renames_a_category(staff):
    category = add_category(staff, "Dairy")

    response = send(staff, "patch", f"/api/admin/categories/{category['id']}", {"name": "Dairy & Eggs"})

    assert response.status_code == 200
    assert response.json()["name"] == "Dairy & Eggs"
    assert category_names(staff) == [("Dairy & Eggs", True)]


def test_renaming_to_another_categorys_name_is_rejected(staff):
    add_category(staff, "Snacks")
    beverages = add_category(staff, "Beverages")

    response = send(staff, "patch", f"/api/admin/categories/{beverages['id']}", {"name": "snacks"})

    assert response.status_code == 400
    assert response.json()["errors"] == {"name": "There is already a category with this name."}


def test_staff_hides_and_unhides_a_category_which_is_kept(staff):
    category = add_category(staff, "Festival Specials")

    hidden = send(staff, "patch", f"/api/admin/categories/{category['id']}", {"is_visible": False})
    assert hidden.json()["is_visible"] is False
    assert category_names(staff) == [("Festival Specials", False)]

    shown = send(staff, "patch", f"/api/admin/categories/{category['id']}", {"is_visible": True})
    assert shown.json()["is_visible"] is True


def test_categories_cannot_be_deleted(staff):
    category = add_category(staff, "Cleaning")

    response = send(staff, "delete", f"/api/admin/categories/{category['id']}")

    assert response.status_code == 405
    assert category_names(staff) == [("Cleaning", True)]


def test_staff_reorders_categories(staff):
    first, second, third = (add_category(staff, name)["id"] for name in ["Rice", "Oil", "Snacks"])

    response = send(staff, "put", "/api/admin/categories/order", {"ids": [third, first, second]})

    assert response.status_code == 204
    assert category_names(staff) == [("Snacks", True), ("Rice", True), ("Oil", True)]


def test_reorder_must_list_every_category_once(staff):
    first, second = (add_category(staff, name)["id"] for name in ["Rice", "Oil"])

    for ids in [[first], [first, first], [first, second, 999]]:
        response = send(staff, "put", "/api/admin/categories/order", {"ids": ids})
        assert response.status_code == 400
    assert category_names(staff) == [("Rice", True), ("Oil", True)]


def test_category_list_is_paginated(staff):
    for number in range(3):
        add_category(staff, f"Category {number}")

    first_page = staff.get("/api/admin/categories?page_size=2").json()
    second_page = staff.get("/api/admin/categories?page_size=2&page=2").json()

    assert first_page["count"] == 3
    assert [category["name"] for category in first_page["items"]] == ["Category 0", "Category 1"]
    assert [category["name"] for category in second_page["items"]] == ["Category 2"]


def test_unknown_category_is_not_found(staff):
    assert send(staff, "patch", "/api/admin/categories/999", {"name": "Nothing"}).status_code == 404


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("get", "/api/admin/categories"),
        ("post", "/api/admin/categories"),
        ("patch", "/api/admin/categories/1"),
        ("put", "/api/admin/categories/order"),
    ],
)
def test_anonymous_visitors_are_rejected(method, path):
    response = getattr(Client(), method)(path, data={"name": "Fruits"}, content_type="application/json")

    assert response.status_code == 401


def test_writes_without_the_csrf_token_are_rejected(staff):
    response = staff.post("/api/admin/categories", data={"name": "Fruits"}, content_type="application/json")

    assert response.status_code == 403
