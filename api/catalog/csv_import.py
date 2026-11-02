"""Importing products from a CSV export of the billing software.

Two phases over the same file: `preview` plans the import and reports it without saving anything, `apply` plans it
again inside one transaction and writes it only if no row has a problem.

Rows sharing a `group` become one Product with several Pack Options; rows without one are a single-option Product.
Pack Options are matched to existing ones by `code` and updated (label, price, stock); an existing Product's own name
and Category are left alone. Categories are matched by name in any case and created when missing.
"""

import csv
import io
import re
from dataclasses import dataclass, field

from django.db import transaction
from django.db.models import Max

from catalog.models import Category, PackOption, Product

REQUIRED_COLUMNS = ["code", "name", "category", "pack_label", "price"]
MAX_BYTES = 5 * 1024 * 1024
MAX_ROWS = 10_000

# Longest values the models take.
MAX_CODE, MAX_NAME, MAX_CATEGORY, MAX_LABEL = 64, 200, 100, 50

PRICE = re.compile(r"^-?\d+(\.\d{1,2})?$")
IN_STOCK = {"yes": True, "y": True, "true": True, "1": True, "no": False, "n": False, "false": False, "0": False}


class ImportFileError(Exception):
    """The file as a whole can't be read; the message is for the Staff Member."""


@dataclass
class Row:
    number: int  # The row's line in a spreadsheet: the header is row 1.
    code: str
    name: str
    category: str
    label: str
    price_paise: int
    group: str
    in_stock: bool | None  # None when the cell is blank.


@dataclass
class RowError:
    row: int
    code: str
    name: str
    message: str


@dataclass
class ProductPlan:
    """One Product the file touches: new, or an existing one gaining or updating Pack Options."""

    first: Row  # The first valid row, which names a new Product.
    existing: Product | None = None
    rows: list[Row] = field(default_factory=list)


@dataclass
class Plan:
    total_rows: int = 0
    errors: list[RowError] = field(default_factory=list)
    products: list[ProductPlan] = field(default_factory=list)
    existing_options: dict[str, PackOption] = field(default_factory=dict)

    @property
    def products_created(self) -> int:
        return sum(1 for product in self.products if product.existing is None)

    @property
    def pack_options_updated(self) -> int:
        return sum(1 for product in self.products for row in product.rows if row.code in self.existing_options)

    @property
    def pack_options_created(self) -> int:
        return sum(len(product.rows) for product in self.products) - self.pack_options_updated

    @property
    def categories_created(self) -> list[str]:
        """Names for Categories the file needs that don't exist yet, in file order and as first spelled."""
        known = {name.lower() for name in Category.objects.values_list("name", flat=True)}
        names = {}
        for product in sorted(self.products, key=lambda each: each.first.number):
            key = product.first.category.lower()
            if product.existing is None and key not in known:
                names.setdefault(key, product.first.category)
        return list(names.values())

    @property
    def changes(self) -> list[dict]:
        """One entry per valid row, in file order."""
        entries = []
        for product in self.products:
            for row in product.rows:
                option = self.existing_options.get(row.code)
                entries.append(
                    {
                        "row": row.number,
                        "code": row.code,
                        "product": product.existing.name if product.existing else product.first.name,
                        "pack_label": row.label,
                        "old_price_paise": option.price_paise if option else None,
                        "new_price_paise": row.price_paise,
                        "action": "update" if option else "create",
                    }
                )
        return sorted(entries, key=lambda entry: entry["row"])


def plural(count: int, noun: str) -> str:
    return f"{count} {noun}" if count == 1 else f"{count} {noun}s"


def read_table(content: bytes) -> tuple[list[str], list[tuple[int, list[str]]]]:
    """The header names and the non-blank rows with their row numbers."""
    if len(content) > MAX_BYTES:
        raise ImportFileError("The file is larger than 5 MB.")
    try:
        text = content.decode("utf-8-sig")
        records = list(csv.reader(io.StringIO(text)))
    except (UnicodeDecodeError, csv.Error):
        raise ImportFileError("This doesn't look like a CSV file.") from None
    if "\x00" in text:
        raise ImportFileError("This doesn't look like a CSV file.")
    if not text.strip():
        raise ImportFileError("The file is empty.")

    header = [re.sub(r"\s+", "_", name.strip().lower()) for name in records[0]]
    missing = [column for column in REQUIRED_COLUMNS if column not in header]
    if missing:
        names = ", ".join(missing[:-1]) + " and " + missing[-1] if len(missing) > 1 else missing[0]
        raise ImportFileError(f"The file is missing the {names} {'columns' if len(missing) > 1 else 'column'}.")

    rows = [(number, record) for number, record in enumerate(records[1:], start=2) if any(cell.strip() for cell in record)]
    if not rows:
        raise ImportFileError("The file has no product rows.")
    if len(rows) > MAX_ROWS:
        raise ImportFileError(f"The file has more than {MAX_ROWS:,} rows. Split it and import the parts one by one.")
    return header, rows


def read_row(number: int, header: list[str], record: list[str]) -> Row | RowError:
    cells = {column: (record[index].strip() if index < len(record) else "") for index, column in enumerate(header)}
    code, name = cells["code"], cells["name"]

    def error(message: str) -> RowError:
        return RowError(number, code, name, message)

    for column, label in [("code", "Code"), ("name", "Name"), ("category", "Category"), ("pack_label", "Pack label"), ("price", "Price")]:
        if not cells[column]:
            return error(f"{label} is missing.")
    for value, limit, label in [(code, MAX_CODE, "Code"), (name, MAX_NAME, "Name"), (cells["category"], MAX_CATEGORY, "Category"), (cells["pack_label"], MAX_LABEL, "Pack label")]:
        if len(value) > limit:
            return error(f"{label} is longer than {limit} characters.")

    price = cells["price"].removeprefix("₹").strip()
    if not PRICE.match(price):
        return error("Price must be an amount like 24 or 24.50.")
    price_paise = round(float(price) * 100)
    if price_paise < 0:
        return error("Price can't be negative.")

    in_stock = None
    if stock := cells.get("in_stock", ""):
        if stock.lower() not in IN_STOCK:
            return error("In stock must be yes or no.")
        in_stock = IN_STOCK[stock.lower()]
    return Row(number, code, name, cells["category"], cells["pack_label"], price_paise, cells.get("group", ""), in_stock)


def build_plan(content: bytes) -> Plan:
    header, table = read_table(content)
    plan = Plan(total_rows=len(table))
    parsed = [read_row(number, header, record) for number, record in table]

    codes = [row.code for row in parsed if isinstance(row, Row)]
    plan.existing_options = {option.code: option for option in PackOption.objects.select_related("product").filter(code__in=codes)}

    seen_codes: set[str] = set()
    groups: dict[str, ProductPlan] = {}
    for row in parsed:
        if isinstance(row, RowError):
            plan.errors.append(row)
            continue
        if problem := row_problem(row, seen_codes, groups, plan):
            plan.errors.append(RowError(row.number, row.code, row.name, problem))
            continue
        seen_codes.add(row.code)
        option = plan.existing_options.get(row.code)
        product = groups.get(row.group.lower()) if row.group else None
        if product is None:
            product = ProductPlan(first=row, existing=option.product if option else None)
            plan.products.append(product)
            if row.group:
                groups[row.group.lower()] = product
        elif option and product.existing is None:
            product.existing = option.product  # An earlier row of the group was new; the group is this Product's.
        product.rows.append(row)
    return plan


def row_problem(row: Row, seen_codes: set[str], groups: dict[str, ProductPlan], plan: Plan) -> str | None:
    if row.code in seen_codes:
        return "Same code appears twice in the file."
    product = groups.get(row.group.lower()) if row.group else None
    if product is None:
        return None
    if row.name != product.first.name:
        return f"Name differs from the first row of group “{row.group}”."
    if row.category.lower() != product.first.category.lower():
        return f"Category differs from the first row of group “{row.group}”."
    option = plan.existing_options.get(row.code)
    if option and product.existing and option.product_id != product.existing.id:
        return f"Code belongs to a different product than the rest of group “{row.group}”."
    return None


def apply(content: bytes) -> dict[str, int]:
    """Writes the whole file, or nothing. Raises ImportFileError when a row has a problem."""
    with transaction.atomic():
        plan = build_plan(content)
        if plan.errors:
            raise ImportFileError(
                f"The file has {plural(len(plan.errors), 'row')} with a problem, so nothing was imported. "
                "Fix it and choose the file again."
            )
        new_categories = plan.categories_created
        counts = {
            "products_created": plan.products_created,
            "pack_options_created": plan.pack_options_created,
            "pack_options_updated": plan.pack_options_updated,
            "categories_created": len(new_categories),
        }
        write_products(plan, write_categories(new_categories))
    return counts


def write_categories(new_names: list[str]) -> dict[str, Category]:
    """Every Category by lower-case name, after creating the missing ones at the end of the home page order."""
    last = Category.objects.order_by("-position").first()
    start = last.position + 1 if last else 0
    Category.objects.bulk_create([Category(name=name, position=start + index) for index, name in enumerate(new_names)])
    return {category.name.lower(): category for category in Category.objects.all()}


def write_products(plan: Plan, categories: dict[str, Category]) -> None:
    new_products = [product for product in plan.products if product.existing is None]
    created = Product.objects.bulk_create(
        [Product(name=product.first.name, category=categories[product.first.category.lower()]) for product in new_products]
    )
    for plan_product, product in zip(new_products, created):
        plan_product.existing = product

    # New options go after the ones a Product already has.
    last_positions = dict(
        PackOption.objects.filter(product__in=[product.existing for product in plan.products])
        .values("product_id")
        .annotate(last=Max("position"))
        .values_list("product_id", "last")
    )
    to_create, to_update = [], []
    for product in plan.products:
        position = last_positions.get(product.existing.id, -1) + 1
        for row in product.rows:
            option = plan.existing_options.get(row.code)
            if option is None:
                to_create.append(
                    PackOption(
                        product=product.existing,
                        code=row.code,
                        label=row.label,
                        price_paise=row.price_paise,
                        in_stock=True if row.in_stock is None else row.in_stock,
                        position=position,
                    )
                )
                position += 1
                continue
            option.label = row.label
            option.price_paise = row.price_paise
            option.is_visible = True
            if row.in_stock is not None:
                option.in_stock = row.in_stock
            to_update.append(option)
    PackOption.objects.bulk_create(to_create)
    PackOption.objects.bulk_update(to_update, ["label", "price_paise", "is_visible", "in_stock"])
