"""The admin's global search: Products by name or Pack Option code, Orders by number or customer phone."""

import pytest

from catalog.models import Category, PackOption, Product
from orders.models import Order
from orders.test_checkout import area, milk, no_minimum_or_hourly_limit, place, tomato  # noqa: F401
from orders.test_orders_admin import staff  # noqa: F401

pytestmark = pytest.mark.django_db


def search(client, q):
    response = client.get("/api/admin/search", {"q": q})
    assert response.status_code == 200, response.json()
    return response.json()


def order_numbers(client, q):
    return [order["number"] for order in search(client, q)["orders"]]


def product_names(client, q):
    return [product["name"] for product in search(client, q)["products"]]


def test_finds_an_order_by_exact_number(staff, client, area, tomato):
    first = place(client, area, (tomato, 1))
    second = place(client, area, (tomato, 1), phone="9876543211")

    assert order_numbers(staff, str(first.number)) == [first.number]
    assert order_numbers(staff, f"#{second.number}") == [second.number]
    assert order_numbers(staff, f" {second.number} ") == [second.number]


def test_an_order_number_with_leading_zeros_is_not_exact(staff, client, area, tomato):
    order = place(client, area, (tomato, 1))

    assert order_numbers(staff, f"0{order.number}") == []


def test_an_order_number_is_not_matched_by_prefix(staff, client, area, tomato):
    orders = [place(client, area, (tomato, 1), phone=f"98765432{n:02}") for n in range(12)]

    assert order_numbers(staff, str(orders[0].number)) == [orders[0].number]
    assert order_numbers(staff, str(orders[-1].number + 1)) == []


@pytest.mark.parametrize("typed", ["9876543210", "98765 43210", "+91 98765 43210", "+919876543210", "09876543210", "98765-43210"])
def test_finds_orders_by_phone_in_any_accepted_format(staff, client, area, tomato, typed):
    older = place(client, area, (tomato, 1))
    newer = place(client, area, (tomato, 2))
    place(client, area, (tomato, 1), phone="9876543211")

    assert order_numbers(staff, typed) == [newer.number, older.number]


def test_an_order_result_has_what_staff_need_to_pick_it(staff, client, area, tomato):
    order = place(client, area, (tomato, 1), name="Anita Rao")

    assert search(staff, str(order.number))["orders"] == [
        {
            "number": order.number,
            "customer_name": "Anita Rao",
            "phone": "9876543210",
            "total_paise": 4000 + 2000,
            "status": "new",
        }
    ]


def test_orders_of_any_status_are_found(staff, client, area, tomato):
    order = place(client, area, (tomato, 1))
    order.status = Order.Status.CANCELLED
    order.save()

    assert order_numbers(staff, order.phone) == [order.number]


@pytest.mark.parametrize("q", ["", "   ", "99999", "123", "1234567890", "9876543299", "+44 7911 123456", "nothing here", "#"])
def test_unknown_values_return_nothing(staff, client, area, tomato, q):
    place(client, area, (tomato, 1))

    assert search(staff, q) == {"products": [], "orders": []}


def test_a_huge_number_returns_nothing_instead_of_failing(staff):
    assert search(staff, "9" * 40) == {"products": [], "orders": []}


def test_finds_products_by_name_ignoring_case(staff, tomato, milk):
    assert product_names(staff, "tom") == ["Tomato"]
    assert product_names(staff, "MILK") == ["Milk"]
    assert product_names(staff, "m") == ["Milk", "Tomato"]


def test_finds_a_product_by_exact_pack_option_code(staff, tomato, milk):
    assert product_names(staff, "tomato-1kg") == ["Tomato"]
    assert product_names(staff, "milk-500") == ["Milk"]
    assert product_names(staff, "milk-50") == []


def test_a_hidden_option_code_finds_nothing_but_hidden_products_are_found(staff, tomato):
    tomato.is_visible = False
    tomato.save()
    assert product_names(staff, "tomato-1kg") == []

    tomato.product.is_visible = False
    tomato.product.save()
    assert product_names(staff, "Tomato") == ["Tomato"]


def test_a_product_result_has_what_staff_need_to_pick_it(staff, tomato):
    assert search(staff, "tomato")["products"] == [
        {"id": tomato.product_id, "name": "Tomato", "category": "Vegetables", "thumbnail_url": None}
    ]


def test_each_group_is_limited_to_a_handful_of_results(staff, client, area, tomato):
    category = Category.objects.get()
    for n in range(15):
        product = Product.objects.create(category=category, name=f"Rice {n:02}")
        PackOption.objects.create(product=product, code=f"rice-{n}", label="1 kg", price_paise=100)

    assert len(search(staff, "rice")["products"]) == 8


def test_anonymous_requests_are_rejected(client, area, tomato):
    place(client, area, (tomato, 1))

    assert client.get("/api/admin/search", {"q": "tomato"}).status_code == 401
