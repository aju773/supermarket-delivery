from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from ninja import Router, Schema, Status
from ninja.pagination import PageNumberPagination, paginate
from ninja.security import django_auth

from catalog.models import Category

# Every admin endpoint needs a staff session; django_auth also checks the CSRF token on writes.
router = Router(tags=["admin catalog"], auth=django_auth)

FIX_ERRORS = "Please fix the errors below."
DUPLICATE_NAME = "There is already a category with this name."
PAGE_SIZE = 100


class CategoryName(Schema):
    name: str


class CategoryChange(Schema):
    name: str | None = None
    is_visible: bool | None = None


class CategoryOut(Schema):
    id: int
    name: str
    is_visible: bool


class CategoryOrder(Schema):
    ids: list[int]


def duplicate_name() -> Status:
    return Status(400, {"detail": FIX_ERRORS, "errors": {"name": DUPLICATE_NAME}})


def name_error(name: str, category: Category | None = None) -> Status | None:
    if not name:
        return Status(400, {"detail": FIX_ERRORS, "errors": {"name": "Enter the category name."}})
    others = Category.objects.filter(name__iexact=name)
    if category is not None:
        others = others.exclude(id=category.id)
    return duplicate_name() if others.exists() else None


@router.get("/categories", response=list[CategoryOut])
@paginate(PageNumberPagination, page_size=PAGE_SIZE, max_page_size=PAGE_SIZE)
def list_categories(request):
    return Category.objects.all()


@router.post("/categories", response={201: CategoryOut, 400: dict})
def add_category(request, data: CategoryName):
    name = data.name.strip()
    if error := name_error(name):
        return error
    last = Category.objects.order_by("-position").first()
    try:
        with transaction.atomic():
            category = Category.objects.create(name=name, position=last.position + 1 if last else 0)
    except IntegrityError:  # Another request added the same name in the meantime.
        return duplicate_name()
    return Status(201, category)


@router.put("/categories/order", response={204: None, 400: dict})
@transaction.atomic
def reorder_categories(request, order: CategoryOrder):
    categories = {category.id: category for category in Category.objects.select_for_update()}
    if len(order.ids) != len(set(order.ids)) or set(order.ids) != categories.keys():
        return Status(400, {"detail": "The list of categories has changed. Reload the page and try again."})
    for position, category_id in enumerate(order.ids):
        categories[category_id].position = position
    Category.objects.bulk_update(categories.values(), ["position"])
    return Status(204, None)


@router.patch("/categories/{category_id}", response={200: CategoryOut, 400: dict})
def change_category(request, category_id: int, change: CategoryChange):
    category = get_object_or_404(Category, id=category_id)
    if change.name is not None:
        name = change.name.strip()
        if error := name_error(name, category):
            return error
        category.name = name
    if change.is_visible is not None:
        category.is_visible = change.is_visible
    try:
        with transaction.atomic():
            category.save()
    except IntegrityError:
        return duplicate_name()
    return Status(200, category)
