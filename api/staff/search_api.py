"""The admin's global search box: Products by name or code, Orders by number or customer phone."""

from django.db.models import Q
from ninja import Router, Schema
from ninja.security import django_auth

from catalog.admin_api import matching
from catalog.models import Product
from orders.checkout import normalise_phone
from orders.models import Order

# Every admin endpoint needs a staff session.
router = Router(tags=["admin search"], auth=django_auth)

RESULTS_PER_GROUP = 8
# Order numbers are database integers; anything longer can't be one.
MAX_NUMBER_DIGITS = 9


class ProductResult(Schema):
    id: int
    name: str
    category: str
    thumbnail_url: str | None

    @staticmethod
    def resolve_category(product: Product) -> str:
        return product.category.name

    @staticmethod
    def resolve_thumbnail_url(product: Product) -> str | None:
        return product.thumbnail.url if product.thumbnail else None


class OrderResult(Schema):
    number: int
    customer_name: str
    phone: str
    total_paise: int
    status: Order.Status


class SearchResults(Schema):
    products: list[ProductResult]
    orders: list[OrderResult]


def find_orders(q: str) -> list[Order]:
    """Orders with exactly this number ("1047" or "#1047"), or from this phone typed in any accepted format."""
    number = q.removeprefix("#")
    phone = normalise_phone(q)
    match = Q(pk__in=[])
    # Digits with no leading zero: "0047" isn't order 47's number.
    if number.isascii() and number.isdigit() and not number.startswith("0") and len(number) <= MAX_NUMBER_DIGITS:
        match |= Q(id=int(number))
    if phone is not None:
        match |= Q(phone=phone)
    return list(Order.objects.filter(match).order_by("-id")[:RESULTS_PER_GROUP])


@router.get("/search", response=SearchResults)
def search(request, q: str = ""):
    """Up to a handful of matches in each group; empty groups come back empty."""
    q = q.strip()
    if not q:
        return {"products": [], "orders": []}
    products = matching(Product.objects.select_related("category"), q)[:RESULTS_PER_GROUP]
    return {"products": list(products), "orders": find_orders(q)}
