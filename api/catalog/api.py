from django.db.models import Exists, OuterRef, Prefetch
from django.shortcuts import get_object_or_404
from ninja import Router, Schema

from catalog.models import Category, PackOption, Product

# The customer catalog: no login needed.
router = Router(tags=["catalog"], auth=None)


class CategoryOut(Schema):
    id: int
    name: str


class PackOptionOut(Schema):
    """Out-of-stock options are still returned, flagged, so the site can grey them out."""

    id: int
    label: str
    price_paise: int
    in_stock: bool


class ProductOut(Schema):
    id: int
    name: str
    category: CategoryOut
    pack_options: list[PackOptionOut]
    photo_url: str | None
    thumbnail_url: str | None

    @staticmethod
    def resolve_photo_url(product: Product) -> str | None:
        return product.photo.url if product.photo else None

    @staticmethod
    def resolve_thumbnail_url(product: Product) -> str | None:
        return product.thumbnail.url if product.thumbnail else None


class Home(Schema):
    categories: list[CategoryOut]
    popular: list[ProductOut]


class CategoryListing(Schema):
    category: CategoryOut
    categories: list[CategoryOut]
    products: list[ProductOut]


def visible_categories():
    return Category.objects.filter(is_visible=True)


def visible_products():
    """Products the customer may see: visible, in a visible Category, with at least one visible Pack Option."""
    visible_options = PackOption.objects.filter(is_visible=True)
    return (
        Product.objects.filter(is_visible=True, category__is_visible=True)
        .filter(Exists(visible_options.filter(product=OuterRef("pk"))))
        .select_related("category")
        .prefetch_related(Prefetch("pack_options", queryset=visible_options))
    )


@router.get("/home", response=Home)
def home(request):
    return Home(categories=visible_categories(), popular=visible_products().filter(is_featured=True))


@router.get("/categories/{category_id}", response=CategoryListing)
def category_listing(request, category_id: int):
    categories = list(visible_categories())
    category = get_object_or_404(visible_categories(), id=category_id)
    return CategoryListing(
        category=category, categories=categories, products=visible_products().filter(category=category)
    )


@router.get("/search", response=list[ProductOut])
def search(request, q: str = ""):
    """Products whose name contains the text typed, ignoring case."""
    q = q.strip()
    return visible_products().filter(name__icontains=q) if q else []


@router.get("/products/{product_id}", response=ProductOut)
def product(request, product_id: int):
    return get_object_or_404(visible_products(), id=product_id)
