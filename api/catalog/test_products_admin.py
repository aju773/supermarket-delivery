"""Products and their Pack Options through the admin API: add, edit, stock switch, search and filter."""

import pytest
from django.test import Client

from catalog.models import Category
from catalog.testing import send

pytestmark = pytest.mark.django_db


@pytest.fixture
def vegetables():
    return Category.objects.create(name="Vegetables")


@pytest.fixture
def dairy():
    return Category.objects.create(name="Dairy", position=1)


def option(code, label, price_paise, in_stock=True, **extra):
    return {"code": code, "label": label, "price_paise": price_paise, "in_stock": in_stock, **extra}


def product(name, category, options, **extra):
    return {"name": name, "category_id": category.id, "pack_options": options, **extra}


def add_product(client, data):
    response = send(client, "post", "/api/admin/products", data)
    assert response.status_code == 201, response.json()
    return response.json()


def listed(client, query=""):
    return client.get(f"/api/admin/products{query}").json()["items"]


def listed_names(client, query=""):
    return [item["name"] for item in listed(client, query)]


def test_staff_adds_a_product_with_several_pack_options(staff, vegetables):
    tomato = add_product(
        staff,
        product(
            " Tomato ",
            vegetables,
            [option("2000000000011", "250 g", 1200), option(" 2000000000028 ", "500 g", 2000, in_stock=False)],
            is_featured=True,
        ),
    )

    assert tomato["name"] == "Tomato"
    assert tomato["category"] == {"id": vegetables.id, "name": "Vegetables"}
    assert tomato["is_featured"] is True
    assert tomato["is_visible"] is True
    assert [(o["code"], o["label"], o["price_paise"], o["in_stock"]) for o in tomato["pack_options"]] == [
        ("2000000000011", "250 g", 1200, True),
        ("2000000000028", "500 g", 2000, False),
    ]
    assert staff.get(f"/api/admin/products/{tomato['id']}").json() == tomato
    assert listed(staff) == [tomato]


def test_staff_edits_reorders_adds_and_removes_pack_options(staff, vegetables, dairy):
    tomato = add_product(
        staff,
        product("Tomato", vegetables, [option("11", "250 g", 1200), option("28", "500 g", 2000), option("35", "1 kg", 3800)]),
    )
    small, medium, large = tomato["pack_options"]

    response = send(
        staff,
        "put",
        f"/api/admin/products/{tomato['id']}",
        product(
            "Tomato (local)",
            dairy,
            [
                {**large, "price_paise": 3600},
                option("42", "2 kg", 7000),
                {**small, "label": "250 grams"},
            ],
            is_featured=True,
            is_visible=False,
        ),
    )

    assert response.status_code == 200, response.json()
    edited = response.json()
    assert edited["name"] == "Tomato (local)"
    assert edited["category"]["name"] == "Dairy"
    assert (edited["is_featured"], edited["is_visible"]) == (True, False)
    assert [(o["code"], o["label"], o["price_paise"]) for o in edited["pack_options"]] == [
        ("35", "1 kg", 3600),
        ("42", "2 kg", 7000),
        ("11", "250 grams", 1200),
    ]
    assert edited["pack_options"][0]["id"] == large["id"]
    # The removed option is hidden, not deleted: its code stays taken.
    assert medium["id"] not in [o["id"] for o in edited["pack_options"]]
    clash = send(staff, "post", "/api/admin/products", product("Onion", vegetables, [option("28", "1 kg", 4000)]))
    assert clash.status_code == 400


def test_re_adding_a_removed_code_to_the_same_product_brings_the_option_back(staff, vegetables):
    tomato = add_product(staff, product("Tomato", vegetables, [option("11", "250 g", 1200), option("28", "500 g", 2000)]))
    small, medium = tomato["pack_options"]
    send(staff, "put", f"/api/admin/products/{tomato['id']}", product("Tomato", vegetables, [small]))

    response = send(
        staff, "put", f"/api/admin/products/{tomato['id']}", product("Tomato", vegetables, [small, option("28", "500 g", 2200)])
    )

    assert response.status_code == 200, response.json()
    assert [(o["id"], o["price_paise"]) for o in response.json()["pack_options"]] == [(small["id"], 1200), (medium["id"], 2200)]


def test_a_new_option_can_take_a_code_another_option_gives_up_in_the_same_save(staff, vegetables):
    tomato = add_product(staff, product("Tomato", vegetables, [option("11", "250 g", 1200)]))
    small = tomato["pack_options"][0]

    response = send(
        staff,
        "put",
        f"/api/admin/products/{tomato['id']}",
        product("Tomato", vegetables, [{**small, "code": "12"}, option("11", "500 g", 2000)]),
    )

    assert response.status_code == 200, response.json()
    assert [(o["id"] == small["id"], o["code"], o["label"]) for o in response.json()["pack_options"]] == [
        (True, "12", "250 g"),
        (False, "11", "500 g"),
    ]


def test_removed_pack_options_cannot_be_switched_in_stock(staff, vegetables):
    tomato = add_product(staff, product("Tomato", vegetables, [option("11", "250 g", 1200), option("28", "500 g", 2000)]))
    small, medium = tomato["pack_options"]
    send(staff, "put", f"/api/admin/products/{tomato['id']}", product("Tomato", vegetables, [small]))

    assert send(staff, "patch", f"/api/admin/pack-options/{medium['id']}", {"in_stock": False}).status_code == 404


def test_duplicate_pack_option_codes_are_rejected_with_a_field_error(staff, vegetables):
    add_product(staff, product("Onion", vegetables, [option("2000000000042", "1 kg", 4000)]))

    taken = send(
        staff,
        "post",
        "/api/admin/products",
        product("Tomato", vegetables, [option("11", "250 g", 1200), option("2000000000042", "2 kg", 7000)]),
    )
    repeated = send(
        staff, "post", "/api/admin/products", product("Tomato", vegetables, [option("11", "250 g", 1200), option("11", "500 g", 2000)])
    )

    assert taken.status_code == 400
    assert taken.json()["errors"] == {"pack_options.1.code": "This code is already used by Onion 1 kg."}
    assert repeated.status_code == 400
    assert repeated.json()["errors"] == {"pack_options.1.code": "This code is used twice."}
    assert listed_names(staff) == ["Onion"]


def test_product_fields_are_checked(staff, vegetables):
    response = send(
        staff,
        "post",
        "/api/admin/products",
        {"name": " ", "category_id": 999, "pack_options": [option(" ", " ", -1)]},
    )
    no_options = send(staff, "post", "/api/admin/products", product("Tomato", vegetables, []))

    assert response.status_code == 400
    assert response.json()["errors"] == {
        "name": "Enter the product name.",
        "category_id": "Choose a category.",
        "pack_options.0.code": "Enter the code.",
        "pack_options.0.label": "Enter the pack label, like 500 g.",
        "pack_options.0.price_paise": "Can't be negative.",
    }
    assert no_options.status_code == 400
    assert no_options.json()["errors"] == {"pack_options": "Add at least one pack option."}


def test_staff_flips_a_pack_option_in_and_out_of_stock(staff, vegetables):
    tomato = add_product(staff, product("Tomato", vegetables, [option("11", "250 g", 1200)]))
    pack = tomato["pack_options"][0]

    out = send(staff, "patch", f"/api/admin/pack-options/{pack['id']}", {"in_stock": False})
    assert out.status_code == 200
    assert out.json() == {**pack, "in_stock": False}
    assert listed(staff)[0]["pack_options"][0]["in_stock"] is False

    back = send(staff, "patch", f"/api/admin/pack-options/{pack['id']}", {"in_stock": True})
    assert back.json()["in_stock"] is True


def test_search_matches_names_ignoring_case_or_a_code_exactly(staff, vegetables):
    add_product(staff, product("Amul Toned Milk", vegetables, [option("8901262010016", "500 ml", 2700)]))
    add_product(staff, product("Milk Bikis", vegetables, [option("8901063010015", "100 g", 1000)]))
    add_product(staff, product("Tomato", vegetables, [option("2000000000011", "250 g", 1200)]))

    assert listed_names(staff, "?q=MILK") == ["Amul Toned Milk", "Milk Bikis"]
    assert listed_names(staff, "?q=+2000000000011+") == ["Tomato"]
    assert listed_names(staff, "?q=2000000000") == []


def test_category_filter_narrows_the_list(staff, vegetables, dairy):
    add_product(staff, product("Tomato", vegetables, [option("11", "250 g", 1200)]))
    add_product(staff, product("Milk", dairy, [option("12", "500 ml", 2700)]))
    add_product(staff, product("Paneer", dairy, [option("13", "200 g", 9000)]))

    assert listed_names(staff, f"?category_id={dairy.id}") == ["Milk", "Paneer"]
    assert listed_names(staff, f"?category_id={dairy.id}&q=paneer") == ["Paneer"]


def test_featured_and_hidden_flags_can_be_changed_and_hidden_products_stay_listed(staff, vegetables):
    tomato = add_product(staff, product("Tomato", vegetables, [option("11", "250 g", 1200)]))

    response = send(
        staff,
        "put",
        f"/api/admin/products/{tomato['id']}",
        product("Tomato", vegetables, tomato["pack_options"], is_featured=True, is_visible=False),
    )

    assert (response.json()["is_featured"], response.json()["is_visible"]) == (True, False)
    assert [(p["name"], p["is_featured"], p["is_visible"]) for p in listed(staff)] == [("Tomato", True, False)]


def test_products_cannot_be_deleted(staff, vegetables):
    tomato = add_product(staff, product("Tomato", vegetables, [option("11", "250 g", 1200)]))

    assert send(staff, "delete", f"/api/admin/products/{tomato['id']}").status_code == 405
    assert listed_names(staff) == ["Tomato"]


def test_product_list_is_paginated(staff, vegetables):
    for number in range(3):
        add_product(staff, product(f"Product {number}", vegetables, [option(str(number), "1 pc", 100)]))

    first_page = staff.get("/api/admin/products?page_size=2").json()
    second_page = staff.get("/api/admin/products?page_size=2&page=2").json()

    assert first_page["count"] == 3
    assert [item["name"] for item in first_page["items"]] == ["Product 0", "Product 1"]
    assert [item["name"] for item in second_page["items"]] == ["Product 2"]


def test_unknown_products_and_pack_options_are_not_found(staff):
    assert staff.get("/api/admin/products/999").status_code == 404
    assert send(staff, "patch", "/api/admin/pack-options/999", {"in_stock": False}).status_code == 404


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("get", "/api/admin/products"),
        ("get", "/api/admin/products/1"),
        ("post", "/api/admin/products"),
        ("put", "/api/admin/products/1"),
        ("patch", "/api/admin/pack-options/1"),
    ],
)
def test_anonymous_visitors_are_rejected(method, path):
    response = getattr(Client(), method)(path, data={}, content_type="application/json")

    assert response.status_code == 401
