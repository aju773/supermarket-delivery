"""Checkout's happy path and field checks, the starting status, and the public status endpoint."""

from datetime import UTC, datetime

import pytest
import time_machine
from django.db.models import ProtectedError

from catalog.models import Category, PackOption, Product
from orders.models import Order
from shop.models import DeliveryArea, ShopSettings

pytestmark = pytest.mark.django_db

OPEN = datetime(2026, 11, 2, 6, 30, tzinfo=UTC)  # 12:00 in Kolkata
CLOSED = datetime(2026, 11, 2, 18, 30, tzinfo=UTC)  # 00:00 in Kolkata


@pytest.fixture
def area():
    return DeliveryArea.objects.create(name="Gandhi Nagar")


@pytest.fixture
def tomato():
    product = Product.objects.create(category=Category.objects.create(name="Vegetables"), name="Tomato")
    return PackOption.objects.create(product=product, code="tomato-1kg", label="1 kg", price_paise=4000)


@pytest.fixture
def milk():
    product = Product.objects.create(category=Category.objects.create(name="Dairy"), name="Milk")
    return PackOption.objects.create(product=product, code="milk-500", label="500 ml", price_paise=2850)


def details(area, **overrides):
    return {
        "name": "Asha",
        "phone": "98765 43210",
        "delivery_area_id": area.id,
        "address": "12 Temple Street",
        "landmark": "Near the school",
        "note": "Ring twice",
        "payment_method": "upi",
        **overrides,
    }


def cart(*lines):
    return [{"pack_option_id": option.id, "quantity": quantity, "price_paise": option.price_paise} for option, quantity in lines]


def checkout(client, body, at=OPEN):
    with time_machine.travel(at, tick=False):
        return client.post("/api/orders/checkout", body, content_type="application/json")


def place(client, area, *lines, at=OPEN, **overrides):
    response = checkout(client, {**details(area, **overrides), "lines": cart(*lines)}, at)
    assert response.status_code == 201, response.json()
    return Order.objects.get(public_token=response.json()["token"])


def test_checkout_creates_the_order_with_copied_lines_and_totals(client, area, tomato, milk):
    response = checkout(client, {**details(area), "lines": cart((tomato, 2), (milk, 3))})

    assert response.status_code == 201
    body = response.json()
    order = Order.objects.get()
    assert body == {"number": order.number, "token": order.public_token}
    assert len(order.public_token) >= 32
    assert order.public_token != str(order.number)
    assert order.customer_name == "Asha"
    assert order.phone == "9876543210"
    assert order.delivery_area == area
    assert (order.address, order.landmark, order.note, order.payment_method) == (
        "12 Temple Street", "Near the school", "Ring twice", "upi",
    )
    assert [(line.product_name, line.pack_label, line.unit_price_paise, line.quantity) for line in order.lines.all()] == [
        ("Tomato", "1 kg", 4000, 2),
        ("Milk", "500 ml", 2850, 3),
    ]
    assert order.original_request == [
        {"pack_option_id": tomato.id, "product_name": "Tomato", "pack_label": "1 kg", "unit_price_paise": 4000, "quantity": 2},
        {"pack_option_id": milk.id, "product_name": "Milk", "pack_label": "500 ml", "unit_price_paise": 2850, "quantity": 3},
    ]
    assert order.delivery_charge_paise == 2000
    assert order.total_paise == 8000 + 8550 + 2000
    assert order.is_after_hours is False


def test_later_price_changes_do_not_change_the_order(client, area, tomato):
    order = place(client, area, (tomato, 1))
    tomato.price_paise = 5000
    tomato.label = "1 kilo"
    tomato.save()

    line = order.lines.get()
    assert (line.pack_label, line.unit_price_paise) == ("1 kg", 4000)


def test_order_numbers_are_sequential(client, area, tomato):
    first = place(client, area, (tomato, 1))
    second = place(client, area, (tomato, 1), phone="9876543211")
    assert second.number == first.number + 1


@pytest.mark.parametrize("typed", ["9876543210", "+91 98765 43210", "+919876543210", "09876543210", "98765-43210", "91 9876543210"])
def test_phone_is_normalised_to_ten_digits(client, area, tomato, typed):
    assert place(client, area, (tomato, 1), phone=typed).phone == "9876543210"


@pytest.mark.parametrize("typed", ["", "12345", "1234567890", "+44 7911 123456", "98765432101", "98765abcde"])
def test_invalid_phone_is_a_field_error(client, area, tomato, typed):
    response = checkout(client, {**details(area, phone=typed), "lines": cart((tomato, 1))})
    assert response.status_code == 422
    assert set(response.json()["errors"]) == {"phone"}


def test_missing_fields_are_reported_next_to_each_field(client, area, tomato):
    body = details(area, name=" ", address="", payment_method="card", delivery_area_id=None)
    response = checkout(client, {**body, "lines": cart((tomato, 1))})

    assert response.status_code == 422
    assert set(response.json()["errors"]) == {"name", "address", "payment_method", "delivery_area_id"}
    assert response.json()["detail"]
    assert not Order.objects.exists()


def test_inactive_delivery_area_is_rejected(client, area, tomato):
    area.is_active = False
    area.save()

    response = checkout(client, {**details(area), "lines": cart((tomato, 1))})

    assert response.status_code == 422
    assert set(response.json()["errors"]) == {"delivery_area_id"}
    assert not Order.objects.exists()


def test_empty_cart_is_rejected(client, area):
    response = checkout(client, {**details(area), "lines": []})
    assert response.status_code == 422
    assert not Order.objects.exists()


def test_landmark_and_note_are_optional(client, area, tomato):
    body = details(area)
    del body["landmark"], body["note"]
    response = checkout(client, {**body, "lines": cart((tomato, 1))})
    assert response.status_code == 201


def test_order_outside_delivery_hours_is_flagged(client, area, tomato):
    assert place(client, area, (tomato, 1), at=CLOSED).is_after_hours is True


def test_first_time_customer_starts_new_and_repeat_customer_starts_confirmed(client, area, tomato):
    first = place(client, area, (tomato, 1))
    assert first.status == Order.Status.NEW

    # An earlier Order that wasn't Delivered doesn't make a repeat customer.
    assert place(client, area, (tomato, 1), phone="+91 9876543210").status == Order.Status.NEW

    first.status = Order.Status.DELIVERED
    first.save()
    assert place(client, area, (tomato, 1), phone="09876543210").status == Order.Status.CONFIRMED
    assert place(client, area, (tomato, 1), phone="9123456789").status == Order.Status.NEW


def test_ordered_pack_options_and_products_cannot_be_deleted(client, area, tomato):
    place(client, area, (tomato, 1))
    with pytest.raises(ProtectedError):
        tomato.delete()
    with pytest.raises(ProtectedError):
        tomato.product.delete()


def test_status_page_shows_timeline_lines_and_total(client, area, tomato, milk):
    shop = ShopSettings.load()
    shop.phone = "98450 00000"
    shop.save()
    order = place(client, area, (tomato, 2), (milk, 1))

    response = client.get(f"/api/orders/{order.public_token}")

    assert response.status_code == 200
    status = response.json()
    assert status["number"] == order.number
    assert status["status"] == "new"
    assert status["placed_at"] == "2026-11-02T06:30:00Z"
    assert status["timeline"] == [{"status": "new", "at": "2026-11-02T06:30:00Z"}]
    assert status["lines"] == [
        {"product_name": "Tomato", "pack_label": "1 kg", "unit_price_paise": 4000, "quantity": 2, "line_total_paise": 8000},
        {"product_name": "Milk", "pack_label": "500 ml", "unit_price_paise": 2850, "quantity": 1, "line_total_paise": 2850},
    ]
    assert status["subtotal_paise"] == 10850
    assert status["delivery_charge_paise"] == 2000
    assert status["total_paise"] == 12850
    assert status["payment_method"] == "upi"
    assert status["shop_phone"] == "98450 00000"
    assert status["delivery_from"] is None


def test_status_of_an_after_hours_order_says_when_delivery_starts(client, area, tomato):
    order = place(client, area, (tomato, 1), at=CLOSED)

    status = client.get(f"/api/orders/{order.public_token}").json()

    assert status["delivery_from"] == "2026-11-03T08:00:00+05:30"


def test_repeat_customer_timeline_starts_confirmed(client, area, tomato):
    Order.objects.filter(id=place(client, area, (tomato, 1)).id).update(status=Order.Status.DELIVERED)
    order = place(client, area, (tomato, 1))

    status = client.get(f"/api/orders/{order.public_token}").json()

    assert [step["status"] for step in status["timeline"]] == ["confirmed"]


def test_unknown_token_is_not_found(client):
    assert client.get("/api/orders/not-a-real-token").status_code == 404
