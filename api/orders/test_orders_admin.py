"""The staff orders list and order detail."""

import pytest
from django.contrib.auth.models import User
from django.test import Client

from catalog.testing import send
from orders.models import Order
from orders.test_checkout import CLOSED, area, milk, no_minimum_or_hourly_limit, place, tomato  # noqa: F401

pytestmark = pytest.mark.django_db


@pytest.fixture
def staff():
    """A logged-in Staff Member's browser, enforcing CSRF like a real one."""
    User.objects.create_user(username="priya", password="correct horse battery")
    client = Client(enforce_csrf_checks=True)
    client.get("/api/admin/auth/csrf")
    send(client, "post", "/api/admin/auth/login", {"username": "priya", "password": "correct horse battery"})
    return client


def deliver(order):
    # Setting the status directly keeps these tests independent of the allowed transitions.
    order.status = Order.Status.DELIVERED
    order.save()


def numbers(response):
    assert response.status_code == 200, response.json()
    return [item["number"] for item in response.json()["items"]]


def test_list_shows_every_order_newest_first(staff, client, area, tomato):
    first = place(client, area, (tomato, 1))
    second = place(client, area, (tomato, 2), phone="9876543211", name="Ravi")

    response = staff.get("/api/admin/orders")

    assert numbers(response) == [second.number, first.number]
    assert response.json()["count"] == 2
    item = response.json()["items"][0]
    assert item == {
        "number": second.number,
        "customer_name": "Ravi",
        "area": "Gandhi Nagar",
        "total_paise": 8000 + 2000,
        "placed_at": item["placed_at"],
        "status": "new",
        "is_after_hours": False,
        "call_to_confirm": True,
    }


def test_list_filters_by_status(staff, client, area, tomato):
    delivered = place(client, area, (tomato, 1))
    deliver(delivered)
    confirmed = place(client, area, (tomato, 1))
    new = place(client, area, (tomato, 1), phone="9876543211")

    assert numbers(staff.get("/api/admin/orders?status=new")) == [new.number]
    assert numbers(staff.get("/api/admin/orders?status=confirmed")) == [confirmed.number]
    assert numbers(staff.get("/api/admin/orders?status=delivered")) == [delivered.number]
    assert numbers(staff.get("/api/admin/orders?status=cancelled")) == []


def test_list_rejects_an_unknown_status(staff):
    assert staff.get("/api/admin/orders?status=lost").status_code == 422


def test_list_is_paginated(staff, client, area, tomato):
    placed = [place(client, area, (tomato, 1), phone=f"98765432{n:02}") for n in range(26)]

    first_page = staff.get("/api/admin/orders")
    second_page = staff.get("/api/admin/orders?page=2")

    assert first_page.json()["count"] == 26
    assert numbers(first_page) == [order.number for order in reversed(placed[1:])]
    assert numbers(second_page) == [placed[0].number]


def test_call_to_confirm_marks_orders_from_first_time_customers(staff, client, area, tomato):
    first = place(client, area, (tomato, 1))
    deliver(first)
    repeat = place(client, area, (tomato, 1))

    flags = {item["number"]: item["call_to_confirm"] for item in staff.get("/api/admin/orders").json()["items"]}

    assert flags == {first.number: True, repeat.number: False}


def test_after_hours_orders_are_flagged(staff, client, area, tomato):
    place(client, area, (tomato, 1), at=CLOSED)
    assert staff.get("/api/admin/orders").json()["items"][0]["is_after_hours"] is True


def test_detail_has_everything_needed_to_pack_and_deliver(staff, client, area, tomato, milk):
    order = place(client, area, (tomato, 2), (milk, 3))

    response = staff.get(f"/api/admin/orders/{order.number}")

    assert response.status_code == 200
    body = response.json()
    assert body == {
        "number": order.number,
        "customer_name": "Asha",
        "phone": "9876543210",
        "area": "Gandhi Nagar",
        "address": "12 Temple Street",
        "landmark": "Near the school",
        "note": "Ring twice",
        "payment_method": "upi",
        "placed_at": body["placed_at"],
        "status": "new",
        "is_after_hours": False,
        "call_to_confirm": True,
        "lines": [
            {"product_name": "Tomato", "pack_label": "1 kg", "unit_price_paise": 4000, "quantity": 2, "line_total_paise": 8000},
            {"product_name": "Milk", "pack_label": "500 ml", "unit_price_paise": 2850, "quantity": 3, "line_total_paise": 8550},
        ],
        "subtotal_paise": 16550,
        "delivery_charge_paise": 2000,
        "total_paise": 18550,
        "history": [{"status": "new", "at": body["placed_at"], "by": "customer"}],
    }


def test_detail_of_an_unknown_order_is_not_found(staff):
    assert staff.get("/api/admin/orders/999999").status_code == 404


@pytest.mark.parametrize("path", ["/api/admin/orders", "/api/admin/orders/1"])
def test_anonymous_visitors_are_rejected(client, area, tomato, path):
    place(client, area, (tomato, 1))
    assert Client().get(path).status_code == 401
