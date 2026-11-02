"""My orders (summaries for the tokens saved on a phone) and the reorder lookup."""

import pytest

from orders.models import Order
from orders.test_checkout import area, milk, no_minimum_or_hourly_limit, place, tomato  # noqa: F401

pytestmark = pytest.mark.django_db


def mine(client, tokens):
    return client.post("/api/orders/mine", {"tokens": tokens}, content_type="application/json")


def reorder(client, order):
    return client.get(f"/api/orders/{order.public_token}/reorder")


def test_my_orders_lists_summaries_in_the_order_of_the_tokens(client, area, tomato, milk):
    first = place(client, area, (tomato, 2), (milk, 1))
    second = place(client, area, (milk, 3))
    second.status = Order.Status.DELIVERED
    second.save()

    response = mine(client, [second.public_token, first.public_token])

    assert response.status_code == 200
    assert response.json() == [
        {
            "token": second.public_token,
            "number": second.number,
            "status": "delivered",
            "placed_at": response.json()[0]["placed_at"],
            "item_count": 3,
            "total_paise": 3 * 2850 + 2000,
        },
        {
            "token": first.public_token,
            "number": first.number,
            "status": first.status,
            "placed_at": response.json()[1]["placed_at"],
            "item_count": 3,
            "total_paise": 2 * 4000 + 2850 + 2000,
        },
    ]


def test_my_orders_skips_unknown_tokens(client, area, tomato):
    order = place(client, area, (tomato, 1))

    response = mine(client, ["nonsense", order.public_token])

    assert [entry["number"] for entry in response.json()] == [order.number]


def test_my_orders_with_no_tokens_is_empty(client):
    assert mine(client, []).json() == []


def test_reorder_returns_the_current_lines_at_current_prices(client, area, tomato, milk):
    order = place(client, area, (tomato, 2), (milk, 1))
    tomato.price_paise = 4400
    tomato.save()

    response = reorder(client, order)

    assert response.status_code == 200
    assert response.json() == {
        "lines": [
            {
                "pack_option_id": tomato.id,
                "product_id": tomato.product_id,
                "product_name": "Tomato",
                "pack_label": "1 kg",
                "price_paise": 4400,
                "quantity": 2,
                "thumbnail_url": None,
            },
            {
                "pack_option_id": milk.id,
                "product_id": milk.product_id,
                "product_name": "Milk",
                "pack_label": "500 ml",
                "price_paise": 2850,
                "quantity": 1,
                "thumbnail_url": None,
            },
        ],
        "skipped": [],
    }


def test_reorder_uses_the_lines_staff_edited_not_the_original_request(client, area, tomato, milk):
    order = place(client, area, (tomato, 2), (milk, 1))
    order.lines.filter(pack_option=milk).delete()
    order.lines.filter(pack_option=tomato).update(quantity=5)

    lines = reorder(client, order).json()["lines"]

    assert [(line["pack_option_id"], line["quantity"]) for line in lines] == [(tomato.id, 5)]


def test_reorder_skips_out_of_stock_lines_and_says_which(client, area, tomato, milk):
    order = place(client, area, (tomato, 2), (milk, 1))
    milk.in_stock = False
    milk.save()

    body = reorder(client, order).json()

    assert [line["pack_option_id"] for line in body["lines"]] == [tomato.id]
    assert body["skipped"] == [{"product_name": "Milk", "pack_label": "500 ml", "reason": "out_of_stock"}]


@pytest.mark.parametrize("hide", ["option", "product", "category"])
def test_reorder_skips_lines_that_are_no_longer_sold(client, area, tomato, milk, hide):
    order = place(client, area, (tomato, 2), (milk, 1))
    if hide == "option":
        milk.is_visible = False
        milk.save()
    elif hide == "product":
        milk.product.is_visible = False
        milk.product.save()
    else:
        milk.product.category.is_visible = False
        milk.product.category.save()

    body = reorder(client, order).json()

    assert [line["pack_option_id"] for line in body["lines"]] == [tomato.id]
    assert body["skipped"] == [{"product_name": "Milk", "pack_label": "500 ml", "reason": "unavailable"}]


def test_reorder_of_an_unknown_token_is_not_found(client):
    assert client.get("/api/orders/nonsense/reorder").status_code == 404
