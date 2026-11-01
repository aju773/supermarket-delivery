"""The public catalog: home page data, category listing, search and product page, with the visibility rules."""

import pytest

from catalog.models import Category, PackOption, Product

pytestmark = pytest.mark.django_db


def make_product(category, name, *, options=(("1 kg", 3000),), **fields):
    product = Product.objects.create(category=category, name=name, **fields)
    for position, (label, price) in enumerate(options):
        PackOption.objects.create(
            product=product, code=f"{name}-{label}".lower(), label=label, price_paise=price, position=position
        )
    return product


def get(client, path):
    response = client.get(path)
    assert response.status_code == 200
    return response.json()


def names(products):
    return [product["name"] for product in products]


@pytest.fixture
def vegetables():
    return Category.objects.create(name="Vegetables", position=0)


def test_home_lists_visible_categories_in_display_order_and_featured_products(client, vegetables):
    fruits = Category.objects.create(name="Fruits", position=1)
    Category.objects.create(name="Hidden", position=2, is_visible=False)
    dairy = Category.objects.create(name="Dairy", position=3)
    fruits.position, dairy.position = 3, 1
    Category.objects.bulk_update([fruits, dairy], ["position"])
    make_product(vegetables, "Tomato", is_featured=True)
    make_product(fruits, "Apple")

    home = get(client, "/api/catalog/home")

    assert [category["name"] for category in home["categories"]] == ["Vegetables", "Dairy", "Fruits"]
    assert names(home["popular"]) == ["Tomato"]


def test_a_product_is_shown_only_when_it_and_its_category_and_an_option_are_visible(client, vegetables):
    hidden_category = Category.objects.create(name="Hidden", is_visible=False)
    make_product(vegetables, "Tomato", is_featured=True)
    make_product(vegetables, "Hidden product", is_visible=False, is_featured=True)
    make_product(hidden_category, "In hidden category", is_featured=True)
    no_options = make_product(vegetables, "No visible options", is_featured=True)
    no_options.pack_options.update(is_visible=False)
    make_product(vegetables, "No options at all", options=(), is_featured=True)

    assert names(get(client, "/api/catalog/home")["popular"]) == ["Tomato"]
    assert names(get(client, f"/api/catalog/categories/{vegetables.id}")["products"]) == ["Tomato"]
    assert names(get(client, "/api/catalog/search?q=o")) == ["Tomato"]
    for product in Product.objects.exclude(name="Tomato"):
        assert client.get(f"/api/catalog/products/{product.id}").status_code == 404
    assert client.get(f"/api/catalog/categories/{hidden_category.id}").status_code == 404


def test_category_listing_has_the_category_row_and_its_products(client, vegetables):
    fruits = Category.objects.create(name="Fruits", position=1)
    make_product(vegetables, "Tomato")
    make_product(vegetables, "Onion")
    make_product(fruits, "Apple")

    listing = get(client, f"/api/catalog/categories/{vegetables.id}")

    assert listing["category"] == {"id": vegetables.id, "name": "Vegetables"}
    assert [category["name"] for category in listing["categories"]] == ["Vegetables", "Fruits"]
    assert names(listing["products"]) == ["Onion", "Tomato"]


def test_search_ignores_case_and_returns_nothing_when_nothing_matches(client, vegetables):
    make_product(vegetables, "Milk")
    make_product(vegetables, "Buttermilk")
    make_product(vegetables, "Bread")

    assert names(get(client, "/api/catalog/search?q=milk")) == ["Buttermilk", "Milk"]
    assert names(get(client, "/api/catalog/search?q=MILK")) == ["Buttermilk", "Milk"]
    assert get(client, "/api/catalog/search?q=cheese") == []
    assert get(client, "/api/catalog/search?q=%20") == []


def test_product_page_returns_every_visible_option_with_out_of_stock_flagged(client, vegetables):
    tomato = make_product(vegetables, "Tomato", options=(("250 g", 1200), ("500 g", 2000), ("1 kg", 3800)))
    tomato.pack_options.filter(label="500 g").update(in_stock=False)
    tomato.pack_options.filter(label="1 kg").update(is_visible=False)

    product = get(client, f"/api/catalog/products/{tomato.id}")

    assert product["name"] == "Tomato"
    assert product["category"] == {"id": vegetables.id, "name": "Vegetables"}
    assert product["photo_url"] is None
    assert [(option["label"], option["price_paise"], option["in_stock"]) for option in product["pack_options"]] == [
        ("250 g", 1200, True),
        ("500 g", 2000, False),
    ]


def test_a_product_with_only_out_of_stock_options_is_still_shown(client, vegetables):
    make_product(vegetables, "Capsicum").pack_options.update(in_stock=False)

    products = get(client, f"/api/catalog/categories/{vegetables.id}")["products"]

    assert names(products) == ["Capsicum"]
    assert products[0]["pack_options"][0]["in_stock"] is False
