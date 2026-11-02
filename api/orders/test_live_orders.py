"""The live orders list: polling for Orders placed or cancelled since a cursor."""

from datetime import timedelta

import pytest
import time_machine
from django.contrib.auth.models import User

from orders.models import Order, StatusChange
from orders.status import change_status
from orders.test_checkout import OPEN, area, milk, no_minimum_or_hourly_limit, place, tomato  # noqa: F401
from orders.test_orders_admin import staff  # noqa: F401

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def an_hour_after_checkout():
    """Orders are placed at OPEN; polls come later, once any missing change id has had time to commit."""
    with time_machine.travel(OPEN + timedelta(hours=1)):
        yield


def poll(staff, after=None):
    response = staff.get("/api/admin/orders/changes" + ("" if after is None else f"?after={after}"))
    assert response.status_code == 200, response.json()
    return response.json()


def numbers(items):
    return [item["number"] for item in items]


def test_without_a_cursor_returns_only_the_current_cursor(staff, client, area, tomato):
    place(client, area, (tomato, 1))

    body = poll(staff)

    assert body["placed"] == [] and body["cancelled"] == [] and body["updated"] == []
    assert isinstance(body["cursor"], int)


def test_returns_orders_placed_after_the_cursor_and_nothing_older(staff, client, area, tomato):
    place(client, area, (tomato, 1))
    cursor = poll(staff)["cursor"]
    first = place(client, area, (tomato, 1), phone="9876543211")
    second = place(client, area, (tomato, 2), phone="9876543212", name="Ravi")

    body = poll(staff, cursor)

    assert numbers(body["placed"]) == [first.number, second.number]
    assert body["placed"][1]["customer_name"] == "Ravi"
    assert body["cancelled"] == []
    assert body["updated"] == [first.number, second.number]
    assert poll(staff, body["cursor"])["placed"] == []


def test_returns_orders_the_customer_cancelled_after_the_cursor(staff, client, area, tomato):
    old = place(client, area, (tomato, 1))
    order = place(client, area, (tomato, 1), phone="9876543211")
    change_status(old, Order.Status.CANCELLED)
    cursor = poll(staff)["cursor"]

    change_status(order, Order.Status.CANCELLED)
    body = poll(staff, cursor)

    assert body["placed"] == []
    assert numbers(body["cancelled"]) == [order.number]
    assert body["cancelled"][0]["status"] == "cancelled"
    assert body["updated"] == [order.number]


def test_staff_changes_update_rows_without_an_alert(staff, client, area, tomato):
    order = place(client, area, (tomato, 1))
    cursor = poll(staff)["cursor"]
    by = User.objects.get(username="priya")
    change_status(order, Order.Status.CONFIRMED, by=by)
    change_status(order, Order.Status.CANCELLED, by=by)

    body = poll(staff, cursor)

    assert body["placed"] == [] and body["cancelled"] == []
    assert body["updated"] == [order.number]


def in_flight(order):
    """Hides the Order's checkout change, as if its transaction got an id but hasn't committed yet."""
    change = order.status_changes.get()
    StatusChange.objects.filter(id=change.id).delete()
    return change


def test_waits_for_a_change_still_being_committed(staff, client, area, tomato):
    place(client, area, (tomato, 1))
    cursor = poll(staff)["cursor"]
    slow = place(client, area, (tomato, 1), phone="9876543211")
    pending = in_flight(slow)
    fast = place(client, area, (tomato, 1), phone="9876543212")

    with time_machine.travel(OPEN + timedelta(seconds=1)):
        body = poll(staff, cursor)
        assert body["placed"] == [] and body["cursor"] == cursor

        StatusChange.objects.create(id=pending.id, order=slow, status=pending.status, changed_at=pending.changed_at)
        body = poll(staff, cursor)

    assert numbers(body["placed"]) == [slow.number, fast.number]


def test_a_gap_that_never_fills_stops_holding_back_later_changes(staff, client, area, tomato):
    place(client, area, (tomato, 1))
    cursor = poll(staff)["cursor"]
    in_flight(place(client, area, (tomato, 1), phone="9876543211"))
    later = place(client, area, (tomato, 1), phone="9876543212")

    with time_machine.travel(OPEN + timedelta(minutes=1)):
        body = poll(staff, cursor)

    assert numbers(body["placed"]) == [later.number]
    assert body["cursor"] == later.status_changes.get().id


def test_needs_a_staff_session(client):
    assert client.get("/api/admin/orders/changes").status_code == 401
