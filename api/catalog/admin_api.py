from django.db import IntegrityError, transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from ninja import File, Router, Schema, Status
from ninja.files import UploadedFile
from ninja.pagination import PageNumberPagination, paginate
from ninja.security import django_auth

from catalog import bulk_photos, csv_import, photos
from catalog.models import Category, PackOption, Product

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


# Products and Pack Options

PRODUCT_PAGE_SIZE = 25
OPTIONS_CHANGED = "The pack options have changed. Reload the page and try again."


class CategoryRef(Schema):
    id: int
    name: str


class PackOptionIn(Schema):
    id: int | None = None
    code: str
    label: str
    price_paise: int
    in_stock: bool = True


class PackOptionOut(Schema):
    id: int
    code: str
    label: str
    price_paise: int
    in_stock: bool


class PackOptionStock(Schema):
    in_stock: bool


class ProductIn(Schema):
    name: str
    category_id: int
    is_featured: bool = False
    is_visible: bool = True
    pack_options: list[PackOptionIn]


class ProductOut(Schema):
    id: int
    name: str
    category: CategoryRef
    is_featured: bool
    is_visible: bool
    pack_options: list[PackOptionOut]
    photo_url: str | None
    thumbnail_url: str | None

    @staticmethod
    def resolve_photo_url(product: Product) -> str | None:
        return product.photo.url if product.photo else None

    @staticmethod
    def resolve_thumbnail_url(product: Product) -> str | None:
        return product.thumbnail.url if product.thumbnail else None

    @staticmethod
    def resolve_pack_options(product: Product) -> list[PackOption]:
        return [option for option in product.pack_options.all() if option.is_visible]


def products_with_options():
    return Product.objects.select_related("category").prefetch_related("pack_options")


def product_errors(data: ProductIn, product: Product | None) -> dict[str, str]:
    """Field errors keyed like the form fields, e.g. "pack_options.1.code"."""
    errors = {}
    if not data.name.strip():
        errors["name"] = "Enter the product name."
    if not Category.objects.filter(id=data.category_id).exists():
        errors["category_id"] = "Choose a category."
    if not data.pack_options:
        errors["pack_options"] = "Add at least one pack option."
    codes = [option.code.strip() for option in data.pack_options]
    # Codes held by other Products' options, hidden ones included: a code is unique for good.
    taken = {
        option.code: option
        for option in PackOption.objects.select_related("product").filter(code__in=codes).exclude(product=product)
    }
    for index, (option, code) in enumerate(zip(data.pack_options, codes)):
        field = f"pack_options.{index}"
        if not code:
            errors[f"{field}.code"] = "Enter the code."
        elif code in codes[:index]:
            errors[f"{field}.code"] = "This code is used twice."
        elif code in taken:
            errors[f"{field}.code"] = f"This code is already used by {taken[code]}."
        if not option.label.strip():
            errors[f"{field}.label"] = "Enter the pack label, like 500 g."
        if option.price_paise < 0:
            errors[f"{field}.price_paise"] = "Can't be negative."
    return errors


def save_product(data: ProductIn, product: Product | None) -> Status:
    try:
        with transaction.atomic():
            return write_product(data, product)
    except IntegrityError:  # Another request took one of the codes, or two options swapped codes.
        return Status(400, {"detail": "One of these codes is already in use. Reload the page and try again."})


def write_product(data: ProductIn, product: Product | None) -> Status:
    if errors := product_errors(data, product):
        return Status(400, {"detail": FIX_ERRORS, "errors": errors})
    existing = {option.id: option for option in product.pack_options.select_for_update()} if product else {}
    if any(option.id is not None and option.id not in existing for option in data.pack_options):
        return Status(400, {"detail": OPTIONS_CHANGED})
    referenced = {option.id for option in data.pack_options}
    # Options the form left out (removed now or earlier), by code, so re-adding a code brings its option back.
    by_code = {option.code: option for option in existing.values() if option.id not in referenced}

    is_new = product is None
    product = product or Product()
    product.name = data.name.strip()
    product.category_id = data.category_id
    product.is_featured = data.is_featured
    product.is_visible = data.is_visible
    product.save()

    kept = set()
    for position, option_in in enumerate(data.pack_options):
        code = option_in.code.strip()
        # A code this Product already has (perhaps on a removed option) reuses that option.
        option = existing[option_in.id] if option_in.id is not None else by_code.get(code, PackOption(product=product))
        option.code = code
        option.label = option_in.label.strip()
        option.price_paise = option_in.price_paise
        option.in_stock = option_in.in_stock
        option.position = position
        option.is_visible = True
        kept.add(option.id)
        option.save()
    for option in existing.values():
        if option.id not in kept:
            option.is_visible = False
            option.save(update_fields=["is_visible"])
    return Status(201 if is_new else 200, products_with_options().get(id=product.id))


def matching(products, q: str):
    """Products whose name contains `q` (any case) or that have a visible Pack Option with exactly this code."""
    code_matches = PackOption.objects.filter(code=q, is_visible=True).values("product_id")
    return products.filter(Q(name__icontains=q) | Q(id__in=code_matches))


@router.get("/products", response=list[ProductOut])
@paginate(PageNumberPagination, page_size=PRODUCT_PAGE_SIZE, max_page_size=PRODUCT_PAGE_SIZE)
def list_products(request, q: str = "", category_id: int | None = None):
    products = products_with_options()
    if category_id is not None:
        products = products.filter(category_id=category_id)
    if q := q.strip():
        products = matching(products, q)
    return products


@router.post("/products", response={201: ProductOut, 400: dict})
def add_product(request, data: ProductIn):
    return save_product(data, None)


@router.get("/products/{product_id}", response=ProductOut)
def get_product(request, product_id: int):
    return get_object_or_404(products_with_options(), id=product_id)


@router.put("/products/{product_id}", response={200: ProductOut, 400: dict})
def change_product(request, product_id: int, data: ProductIn):
    return save_product(data, get_object_or_404(Product, id=product_id))


@router.post("/products/{product_id}/photo", response={200: ProductOut, 400: dict})
def upload_photo(request, product_id: int, photo: File[UploadedFile]):
    product = get_object_or_404(products_with_options(), id=product_id)
    try:
        photos.set_photo(product, photo)
    except photos.PhotoError as error:
        return Status(400, {"detail": str(error)})
    return Status(200, product)


@router.delete("/products/{product_id}/photo", response=ProductOut)
def remove_photo(request, product_id: int):
    product = get_object_or_404(products_with_options(), id=product_id)
    photos.remove_photo(product)
    return product


@router.patch("/pack-options/{option_id}", response=PackOptionOut)
def change_stock(request, option_id: int, change: PackOptionStock):
    option = get_object_or_404(PackOption, id=option_id, is_visible=True)
    option.in_stock = change.in_stock
    option.save(update_fields=["in_stock"])
    return option


# CSV import

class ImportRowError(Schema):
    row: int
    code: str
    name: str
    message: str


class ImportChange(Schema):
    row: int
    code: str
    product: str
    pack_label: str
    old_price_paise: int | None
    new_price_paise: int
    action: str


class ImportPreview(Schema):
    total_rows: int
    products_created: int
    pack_options_created: int
    pack_options_updated: int
    categories_created: list[str]
    errors: list[ImportRowError]
    changes: list[ImportChange]


class ImportResult(Schema):
    products_created: int
    pack_options_created: int
    pack_options_updated: int
    categories_created: int


@router.post("/import/preview", response={200: ImportPreview, 400: dict})
def preview_import(request, file: File[UploadedFile]):
    """Reads the file and reports what applying it would do. Saves nothing."""
    try:
        plan = csv_import.build_plan(file.read())
    except csv_import.ImportFileError as error:
        return Status(400, {"detail": str(error)})
    return {
        "total_rows": plan.total_rows,
        "products_created": plan.products_created,
        "pack_options_created": plan.pack_options_created,
        "pack_options_updated": plan.pack_options_updated,
        "categories_created": plan.categories_created,
        "errors": plan.errors,
        "changes": plan.changes,
    }


@router.post("/import/apply", response={200: ImportResult, 400: dict})
def apply_import(request, file: File[UploadedFile]):
    """Saves the whole file, or nothing when any row has a problem."""
    try:
        return csv_import.apply(file.read())
    except csv_import.ImportFileError as error:
        return Status(400, {"detail": str(error)})
    except IntegrityError:  # Someone else took one of the new codes while the import ran.
        return Status(400, {"detail": "A product code changed while importing, so nothing was imported. Choose the file again."})


# Bulk photo upload

class PhotoMatch(Schema):
    filename: str
    code: str
    product: str
    pack_label: str
    thumbnail_url: str


class PhotoMiss(Schema):
    filename: str
    reason: str


class PhotoImportResult(Schema):
    matched: list[PhotoMatch]
    unmatched: list[PhotoMiss]


@router.post("/import/photos", response=PhotoImportResult)
def import_photos(request, files: File[list[UploadedFile]]):
    """Sets product photos from image files or zips named by pack option code. Reports the files that didn't match."""
    return bulk_photos.import_photos(files)
