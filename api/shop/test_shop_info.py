"""The public shop info endpoint, including "is the shop open now?" and "next opening time"."""

from datetime import UTC, datetime, time

import pytest
import time_machine

from shop.models import ShopSettings

pytestmark = pytest.mark.django_db


def shop_info(client):
    response = client.get("/api/shop")
    assert response.status_code == 200
    return response.json()


def set_hours(opening: time, closing: time, timezone: str = "Asia/Kolkata"):
    # Arranged through the model until the Shop Settings admin endpoint exists (ticket 03).
    shop_settings = ShopSettings.load()
    shop_settings.opening_time = opening
    shop_settings.closing_time = closing
    shop_settings.timezone = timezone
    shop_settings.save()


def at_utc(*args):
    return time_machine.travel(datetime(*args, tzinfo=UTC), tick=False)


def test_anonymous_customer_gets_default_shop_info(client):
    with at_utc(2026, 11, 2, 6, 30):  # 12:00 in Kolkata
        info = shop_info(client)

    assert info == {
        "name": "Fresh Mart",
        "phone": "",
        "minimum_order_paise": 20000,
        "delivery_charge_paise": 2000,
        "opening_time": "08:00",
        "closing_time": "21:00",
        "timezone": "Asia/Kolkata",
        "is_open": True,
        "next_opening_at": None,
    }


def test_closed_before_opening_reopens_the_same_morning(client):
    with at_utc(2026, 11, 2, 1, 0):  # 06:30 in Kolkata
        info = shop_info(client)

    assert info["is_open"] is False
    assert info["next_opening_at"] == "2026-11-02T08:00:00+05:30"


def test_closed_after_closing_reopens_the_next_morning(client):
    with at_utc(2026, 11, 2, 17, 0):  # 22:30 in Kolkata
        info = shop_info(client)

    assert info["is_open"] is False
    assert info["next_opening_at"] == "2026-11-03T08:00:00+05:30"


def test_after_midnight_utc_still_uses_the_shop_date(client):
    # 23:00 UTC on the 2nd is already 04:30 on the 3rd in Kolkata.
    with at_utc(2026, 11, 2, 23, 0):
        info = shop_info(client)

    assert info["is_open"] is False
    assert info["next_opening_at"] == "2026-11-03T08:00:00+05:30"


@pytest.mark.parametrize(
    ("utc_time", "is_open"),
    [
        ((2, 29), False),  # 07:59 in Kolkata
        ((2, 30), True),  # 08:00, opening time
        ((15, 29), True),  # 20:59
        ((15, 30), False),  # 21:00, closing time
    ],
)
def test_opening_time_is_open_and_closing_time_is_closed(client, utc_time, is_open):
    with at_utc(2026, 11, 2, *utc_time):
        assert shop_info(client)["is_open"] is is_open


def test_open_and_closed_follow_the_shop_timezone(client):
    set_hours(time(8), time(21), timezone="Europe/London")

    # 07:30 UTC is 13:00 in Kolkata but 07:30 in London (GMT in November, written with a Z offset).
    with at_utc(2026, 11, 2, 7, 30):
        info = shop_info(client)

    assert info["timezone"] == "Europe/London"
    assert info["is_open"] is False
    assert info["next_opening_at"] == "2026-11-02T08:00:00Z"


@pytest.mark.parametrize(
    ("utc_time", "is_open", "next_opening_at"),
    [
        ((2, 16, 30), True, None),  # 22:00 in Kolkata
        ((2, 20, 30), True, None),  # 02:00 the next day
        ((2, 6, 30), False, "2026-11-02T18:00:00+05:30"),  # 12:00
    ],
)
def test_hours_that_run_past_midnight(client, utc_time, is_open, next_opening_at):
    set_hours(time(18), time(3))

    with at_utc(2026, 11, *utc_time):
        info = shop_info(client)

    assert info["is_open"] is is_open
    assert info["next_opening_at"] == next_opening_at
