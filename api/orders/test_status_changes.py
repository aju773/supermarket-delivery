"""Order status changes by staff and cancelling by the customer through the Status Link."""

from datetime import timedelta

import pytest
import time_machine
from django.utils import timezone

from catalog.testing import send
from orders.models import Order
from orders.test_checkout import OPEN, area, milk, no_minimum_or_hourly_limit, place, tomato  # noqa: F401
from orders.test_orders_admin import staff  # noqa: F401

pytestmark = pytest.mark.django_db

NEW, CONFIRMED, OUT, DELIVERED, CANCELLED = (status.value for status in Order.Status)

STAFF_ALLOWED = {(NEW, CONFIRMED), (CONFIRMED, OUT), (OUT, DELIVERED), (NEW, CANCELLED), (CONFIRMED, CANCELLED), (OUT, CANCELLED)}
CUSTOMER_ALLOWED = {NEW, CONFIRMED}


@pytest.fixture(autouse=True)
def an_hour_after_checkout():
    """Orders are placed at OPEN; status changes come later, with the clock running."""
    with time_machine.travel(OPEN + timedelta(hours=1)):
        yield


@pytest.fixture
def order(client, area, tomato):
    return place(client, area, (tomato, 1))


def at(order, status):
    order.status = status
    order.save()
    return order


def change(staff, order, status):
    return send(staff, "post", f"/api/admin/orders/{order.number}/status", {"status": status})


def cancel(client, order):
    return client.post(f"/api/orders/{order.public_token}/cancel", content_type="application/json")


@pytest.mark.parametrize("start", list(Order.Status))
@pytest.mark.parametrize("target", list(Order.Status))
def test_staff_transitions(staff, order, start, target):
    at(order, start)
    before = order.status_changes.count()

    response = change(staff, order, target)

    order.refresh_from_db()
    if (start, target) in STAFF_ALLOWED:
        assert response.status_code == 200, response.json()
        assert order.status == target
        assert response.json()["status"] == target
        assert order.status_changes.count() == before + 1
    else:
        assert response.status_code == 409
        assert response.json()["detail"]
        assert order.status == start
        assert order.status_changes.count() == before


@pytest.mark.parametrize("start", list(Order.Status))
def test_customer_cancelling(client, order, start):
    at(order, start)
    before = order.status_changes.count()

    response = cancel(client, order)

    order.refresh_from_db()
    if start in CUSTOMER_ALLOWED:
        assert response.status_code == 200, response.json()
        assert order.status == CANCELLED
        assert response.json()["status"] == CANCELLED
        assert response.json()["timeline"][-1]["status"] == CANCELLED
        assert order.status_changes.count() == before + 1
    else:
        assert response.status_code == 409
        assert order.status == start
        assert order.status_changes.count() == before


def test_history_records_who_and_when(staff, client, order):
    before = timezone.now()
    change(staff, order, CONFIRMED)
    cancel(client, order)

    response = staff.get(f"/api/admin/orders/{order.number}")

    history = response.json()["history"]
    assert [(entry["status"], entry["by"]) for entry in history] == [
        (NEW, "customer"),
        (CONFIRMED, "priya"),
        (CANCELLED, "customer"),
    ]
    assert all(entry["at"] for entry in history)
    changes = list(order.status_changes.all())
    assert changes[1].changed_by.username == "priya"
    assert changes[2].changed_by is None
    assert changes[1].changed_at >= before
    assert changes[2].changed_at >= changes[1].changed_at


def test_customer_timeline_shows_transition_times(staff, client, order):
    change(staff, order, CONFIRMED)
    change(staff, order, OUT)

    timeline = client.get(f"/api/orders/{order.public_token}").json()["timeline"]

    assert [step["status"] for step in timeline] == [NEW, CONFIRMED, OUT]


def test_unknown_status_and_order_are_rejected(staff, order):
    assert change(staff, order, "lost").status_code == 422
    assert send(staff, "post", "/api/admin/orders/999999/status", {"status": CONFIRMED}).status_code == 404


def test_customer_needs_the_right_token(client, order):
    assert client.post("/api/orders/not-a-token/cancel").status_code == 404
    order.refresh_from_db()
    assert order.status == NEW


def test_anonymous_cannot_change_status(client, order):
    response = client.post(
        f"/api/admin/orders/{order.number}/status", {"status": CONFIRMED}, content_type="application/json"
    )

    assert response.status_code == 401
    order.refresh_from_db()
    assert order.status == NEW
