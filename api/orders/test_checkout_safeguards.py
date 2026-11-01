"""Checkout safeguards: price and stock changes since the customer added an item, the minimum order and the hourly limit."""

from datetime import timedelta

import pytest

from orders.models import Order
from orders.test_checkout import OPEN, area, cart, checkout, details, milk, place, tomato  # noqa: F401
from shop.models import ShopSettings

pytestmark = pytest.mark.django_db


def submit(client, area, lines, at=OPEN, **overrides):
    return checkout(client, {**details(area, **overrides), "lines": lines}, at)


def test_changed_price_is_rejected_with_old_and_new_price(client, area, tomato, milk):
    lines = cart((tomato, 5), (milk, 1))
    tomato.price_paise = 4400
    tomato.save()

    response = submit(client, area, lines)

    assert response.status_code == 409
    assert response.json()["changes"] == [
        {"pack_option_id": tomato.id, "kind": "price_changed", "old_price_paise": 4000, "new_price_paise": 4400},
    ]
    assert not Order.objects.exists()


def test_out_of_stock_item_is_rejected(client, area, tomato, milk):
    lines = cart((tomato, 5), (milk, 1))
    milk.in_stock = False
    milk.save()

    response = submit(client, area, lines)

    assert response.status_code == 409
    assert response.json()["changes"] == [
        {"pack_option_id": milk.id, "kind": "out_of_stock", "old_price_paise": None, "new_price_paise": None},
    ]
    assert not Order.objects.exists()


@pytest.mark.parametrize("hide", ["option", "product", "category", "deleted"])
def test_item_no_longer_on_sale_is_unavailable(client, area, tomato, milk, hide):
    lines = cart((tomato, 5), (milk, 1))
    if hide == "option":
        milk.is_visible = False
        milk.save()
    elif hide == "product":
        milk.product.is_visible = False
        milk.product.save()
    elif hide == "category":
        milk.product.category.is_visible = False
        milk.product.category.save()
    else:
        milk.delete()

    response = submit(client, area, lines)

    assert response.status_code == 409
    assert [(change["pack_option_id"], change["kind"]) for change in response.json()["changes"]] == [
        (lines[1]["pack_option_id"], "unavailable"),
    ]
    assert not Order.objects.exists()


def test_resubmitting_at_the_new_prices_places_the_order(client, area, tomato, milk):
    tomato.price_paise = 4400
    tomato.save()

    place(client, area, (tomato, 5), (milk, 1))

    assert Order.objects.get().total_paise == 5 * 4400 + 2850 + ShopSettings.load().delivery_charge_paise


def test_order_below_the_minimum_at_server_prices_is_rejected(client, area, tomato):
    shop = ShopSettings.load()
    shop.minimum_order_paise = 20000
    shop.save()

    response = submit(client, area, cart((tomato, 4)))

    assert response.status_code == 422
    assert response.json()["detail"] == "The minimum order is ₹200. Add ₹40 more to place your order."
    assert not Order.objects.exists()
    place(client, area, (tomato, 5))


def test_too_many_orders_from_one_phone_within_an_hour(client, area, tomato):
    shop = ShopSettings.load()
    shop.orders_per_hour_limit = 2
    shop.save()
    place(client, area, (tomato, 5), at=OPEN)
    place(client, area, (tomato, 5), at=OPEN + timedelta(minutes=10), phone="+91 98765 43210")

    response = submit(client, area, cart((tomato, 5)), at=OPEN + timedelta(minutes=20))

    assert response.status_code == 429
    assert "2 orders an hour" in response.json()["detail"]
    assert Order.objects.count() == 2
    place(client, area, (tomato, 5), at=OPEN + timedelta(minutes=20), phone="98765 00000")
    place(client, area, (tomato, 5), at=OPEN + timedelta(minutes=61))


def test_field_errors_come_before_the_limit_and_the_limit_before_price_checks(client, area, tomato):
    shop = ShopSettings.load()
    shop.orders_per_hour_limit = 1
    shop.save()
    place(client, area, (tomato, 5))
    lines = cart((tomato, 5))
    tomato.price_paise = 4400
    tomato.save()

    assert submit(client, area, lines, name="").status_code == 422
    assert submit(client, area, lines).status_code == 429


def test_price_changes_come_before_the_minimum_order(client, area, tomato):
    lines = cart((tomato, 4))
    tomato.price_paise = 2000
    tomato.save()

    assert submit(client, area, lines).status_code == 409
