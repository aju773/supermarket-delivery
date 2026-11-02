"""The summary behind the Orders page tiles and the New orders badge."""

from datetime import UTC, datetime, timedelta

import pytest
import time_machine
from django.test import Client

from orders.models import Order
from orders.test_checkout import OPEN, area, milk, no_minimum_or_hourly_limit, place, tomato  # noqa: F401
from orders.test_orders_admin import staff  # noqa: F401
from shop.models import ShopSettings

pytestmark = pytest.mark.django_db

# OPEN is 12:00 on 2 Nov in Kolkata, so the shop's day runs from 2 Nov 00:00 to 3 Nov 00:00 IST.
START_OF_DAY = datetime(2026, 11, 1, 18, 30, tzinfo=UTC)


@pytest.fixture(autouse=True)
def at_open():
    with time_machine.travel(OPEN):
        yield


def summary(staff):
    response = staff.get("/api/admin/orders/summary")
    assert response.status_code == 200, response.json()
    return response.json()


def set_status(order, status):
    # Setting the status directly keeps these tests independent of the allowed transitions.
    order.status = status
    order.save()


def test_an_empty_shop_has_all_zeros(staff):
    assert summary(staff) == {"orders_today": 0, "sales_today_paise": 0, "new": 0, "out_for_delivery": 0}


def test_counts_todays_orders_and_adds_up_their_totals(staff, client, area, tomato, milk):
    first = place(client, area, (tomato, 1))
    second = place(client, area, (milk, 2), phone="9876543211")

    body = summary(staff)

    assert body["orders_today"] == 2
    assert body["sales_today_paise"] == first.total_paise + second.total_paise


def test_cancelled_orders_are_left_out_of_todays_count_and_sales(staff, client, area, tomato):
    kept = place(client, area, (tomato, 1))
    cancelled = place(client, area, (tomato, 3), phone="9876543211")
    set_status(cancelled, Order.Status.CANCELLED)

    body = summary(staff)

    assert body["orders_today"] == 1
    assert body["sales_today_paise"] == kept.total_paise


def test_yesterdays_orders_are_not_today_in_the_shop_timezone(staff, client, area, tomato):
    # 23:59 on 1 Nov in Kolkata is still 1 Nov in UTC; the next minute is 2 Nov in Kolkata but 1 Nov in UTC.
    place(client, area, (tomato, 1), at=START_OF_DAY - timedelta(minutes=1))
    today = place(client, area, (tomato, 1), phone="9876543211", at=START_OF_DAY)

    body = summary(staff)

    assert body["orders_today"] == 1
    assert body["sales_today_paise"] == today.total_paise


def test_the_day_ends_at_midnight_in_the_shop_timezone(staff, client, area, tomato):
    place(client, area, (tomato, 1))
    with time_machine.travel(START_OF_DAY + timedelta(days=1), tick=False):
        assert summary(staff)["orders_today"] == 0
    with time_machine.travel(START_OF_DAY + timedelta(days=1, minutes=-1), tick=False):
        assert summary(staff)["orders_today"] == 1


def test_the_day_follows_the_shop_timezone_setting(staff, client, area, tomato):
    # At 12:00 UTC on 2 Nov it is 07:00 on 2 Nov in New York. An order at 23:00 UTC on 1 Nov is 18:00 on 1 Nov
    # there (yesterday); one at 05:30 UTC on 2 Nov is 00:30 on 2 Nov there (today).
    shop = ShopSettings.load()
    shop.timezone = "America/New_York"
    shop.save()
    place(client, area, (tomato, 1), at=datetime(2026, 11, 1, 23, 0, tzinfo=UTC))
    today = place(client, area, (tomato, 1), phone="9876543211", at=datetime(2026, 11, 2, 5, 30, tzinfo=UTC))

    with time_machine.travel(datetime(2026, 11, 2, 12, 0, tzinfo=UTC), tick=False):
        body = summary(staff)

    assert body["orders_today"] == 1
    assert body["sales_today_paise"] == today.total_paise


def test_waiting_and_out_for_delivery_match_current_statuses_from_any_day(staff, client, area, tomato):
    old_new = place(client, area, (tomato, 1), at=OPEN - timedelta(days=3))
    old_out = place(client, area, (tomato, 1), phone="9876543211", at=OPEN - timedelta(days=2))
    confirmed = place(client, area, (tomato, 1), phone="9876543212")
    delivered = place(client, area, (tomato, 1), phone="9876543213")
    cancelled = place(client, area, (tomato, 1), phone="9876543214")
    place(client, area, (tomato, 1), phone="9876543215")
    set_status(old_out, Order.Status.OUT_FOR_DELIVERY)
    set_status(confirmed, Order.Status.CONFIRMED)
    set_status(delivered, Order.Status.DELIVERED)
    set_status(cancelled, Order.Status.CANCELLED)

    body = summary(staff)

    assert old_new.status == Order.Status.NEW
    assert body["new"] == 2
    assert body["out_for_delivery"] == 1
    # Today's Confirmed, Delivered and New Orders count; the older ones and the Cancelled one don't.
    assert body["orders_today"] == 3


def test_a_status_change_moves_the_counts(staff, client, area, tomato):
    order = place(client, area, (tomato, 1))
    assert (summary(staff)["new"], summary(staff)["out_for_delivery"]) == (1, 0)

    set_status(order, Order.Status.OUT_FOR_DELIVERY)

    assert (summary(staff)["new"], summary(staff)["out_for_delivery"]) == (0, 1)


def test_anonymous_visitors_are_rejected():
    assert Client().get("/api/admin/orders/summary").status_code == 401
