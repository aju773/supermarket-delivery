"""Staff line edits on an Order: allowed only while New or Confirmed, total recalculated, Original Request untouched."""

import pytest

from catalog.models import Category, PackOption, Product
from catalog.testing import send
from orders.models import Order
from orders.test_checkout import area, milk, no_minimum_or_hourly_limit, place, tomato  # noqa: F401
from orders.test_orders_admin import staff  # noqa: F401

pytestmark = pytest.mark.django_db

DELIVERY = 2000


@pytest.fixture
def rice():
    product = Product.objects.create(category=Category.objects.create(name="Grocery"), name="Rice")
    return PackOption.objects.create(product=product, code="rice-5kg", label="5 kg", price_paise=30000)


@pytest.fixture
def order(client, area, tomato, milk):
    return place(client, area, (tomato, 2), (milk, 3))


def edit(staff, order, *lines):
    body = {"lines": [{"pack_option_id": option.id, "quantity": quantity} for option, quantity in lines]}
    return send(staff, "put", f"/api/admin/orders/{order.number}/lines", body)


def current_lines(order):
    order.refresh_from_db()
    return [(line.product_name, line.pack_label, line.unit_price_paise, line.quantity) for line in order.lines.all()]


def test_changing_a_quantity_recalculates_the_total(staff, order, tomato, milk):
    response = edit(staff, order, (tomato, 2), (milk, 1))

    assert response.status_code == 200, response.json()
    body = response.json()
    assert [(line["product_name"], line["quantity"], line["line_total_paise"]) for line in body["lines"]] == [
        ("Tomato", 2, 8000),
        ("Milk", 1, 2850),
    ]
    assert body["subtotal_paise"] == 10850
    assert body["total_paise"] == 10850 + DELIVERY
    order.refresh_from_db()
    assert order.total_paise == 10850 + DELIVERY


def test_removing_a_line(staff, order, tomato):
    response = edit(staff, order, (tomato, 2))

    assert response.status_code == 200, response.json()
    assert current_lines(order) == [("Tomato", "1 kg", 4000, 2)]
    assert order.total_paise == 8000 + DELIVERY


def test_adding_a_pack_option_copies_its_current_name_label_and_price(staff, order, tomato, milk, rice):
    rice.price_paise = 31000
    rice.save()

    response = edit(staff, order, (tomato, 2), (milk, 3), (rice, 1))

    assert response.status_code == 200, response.json()
    assert current_lines(order)[-1] == ("Rice", "5 kg", 31000, 1)
    assert order.total_paise == 8000 + 8550 + 31000 + DELIVERY


def test_swapping_a_line_for_another_pack_option(staff, order, tomato, milk, rice):
    response = edit(staff, order, (rice, 1), (milk, 3))

    assert response.status_code == 200, response.json()
    assert current_lines(order) == [("Rice", "5 kg", 30000, 1), ("Milk", "500 ml", 2850, 3)]
    assert order.total_paise == 30000 + 8550 + DELIVERY


def test_lines_that_stay_keep_the_price_they_were_ordered_at(staff, order, tomato, milk):
    tomato.price_paise = 5000
    tomato.save()

    edit(staff, order, (tomato, 3), (milk, 3))

    assert current_lines(order)[0] == ("Tomato", "1 kg", 4000, 3)


def test_the_original_request_never_changes(staff, order, tomato, milk, rice):
    before = order.original_request

    edit(staff, order, (rice, 1), (milk, 1))

    order.refresh_from_db()
    assert order.original_request == before
    detail = staff.get(f"/api/admin/orders/{order.number}").json()
    assert detail["original_request"] == [
        {"pack_option_id": tomato.id, "product_name": "Tomato", "pack_label": "1 kg", "unit_price_paise": 4000, "quantity": 2},
        {"pack_option_id": milk.id, "product_name": "Milk", "pack_label": "500 ml", "unit_price_paise": 2850, "quantity": 3},
    ]


@pytest.mark.parametrize("status", [Order.Status.NEW, Order.Status.CONFIRMED])
def test_edits_are_allowed_while_new_or_confirmed(staff, order, tomato, status):
    order.status = status
    order.save()

    assert edit(staff, order, (tomato, 5)).status_code == 200


@pytest.mark.parametrize("status", [Order.Status.OUT_FOR_DELIVERY, Order.Status.DELIVERED, Order.Status.CANCELLED])
def test_edits_are_rejected_in_any_other_status(staff, order, tomato, status):
    order.status = status
    order.save()
    before = current_lines(order)
    total = order.total_paise

    response = edit(staff, order, (tomato, 5))

    assert response.status_code == 409
    assert response.json()["detail"]
    assert current_lines(order) == before
    assert order.total_paise == total


@pytest.mark.parametrize(
    "lines",
    [[], [{"pack_option_id": 0, "quantity": 0}], [{"pack_option_id": 0, "quantity": -1}]],
    ids=["no lines", "zero quantity", "negative quantity"],
)
def test_invalid_lines_are_rejected_and_nothing_changes(staff, order, tomato, lines):
    lines = [{**line, "pack_option_id": tomato.id} for line in lines]
    before = current_lines(order)

    response = send(staff, "put", f"/api/admin/orders/{order.number}/lines", {"lines": lines})

    assert response.status_code == 422
    assert response.json()["detail"]
    assert current_lines(order) == before


def test_the_same_pack_option_twice_is_rejected(staff, order, tomato):
    assert edit(staff, order, (tomato, 1), (tomato, 2)).status_code == 422


def test_an_unknown_or_hidden_pack_option_is_rejected(staff, order, tomato, rice):
    rice.is_visible = False
    rice.save()
    before = current_lines(order)

    assert edit(staff, order, (tomato, 1), (rice, 1)).status_code == 422
    assert send(staff, "put", f"/api/admin/orders/{order.number}/lines", {"lines": [{"pack_option_id": 999999, "quantity": 1}]}).status_code == 422
    assert current_lines(order) == before


def test_a_pack_option_in_a_hidden_category_is_rejected(staff, order, tomato, rice):
    rice.product.category.is_visible = False
    rice.product.category.save()

    assert edit(staff, order, (tomato, 2), (rice, 1)).status_code == 422


def test_editing_an_unknown_order_is_not_found(staff, tomato):
    assert send(staff, "put", "/api/admin/orders/999999/lines", {"lines": [{"pack_option_id": tomato.id, "quantity": 1}]}).status_code == 404


def test_anonymous_visitors_cannot_edit(client, order, tomato):
    body = {"lines": [{"pack_option_id": tomato.id, "quantity": 1}]}
    assert client.put(f"/api/admin/orders/{order.number}/lines", body, content_type="application/json").status_code == 401


def test_the_customer_status_page_shows_the_current_lines_and_total(staff, client, order, tomato, rice):
    edit(staff, order, (tomato, 1), (rice, 2))

    status = client.get(f"/api/orders/{order.public_token}").json()

    assert [(line["product_name"], line["quantity"]) for line in status["lines"]] == [("Tomato", 1), ("Rice", 2)]
    assert status["subtotal_paise"] == 4000 + 60000
    assert status["total_paise"] == 4000 + 60000 + DELIVERY
