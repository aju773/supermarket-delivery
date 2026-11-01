"""Checkout: turns a submitted Cart and customer details into an Order, or a list of field errors."""

import re
from dataclasses import dataclass

from django.db import transaction
from django.utils import timezone

from catalog.models import PackOption
from orders.models import Order, OrderLine, StatusChange
from shop.models import DeliveryArea, ShopSettings


@dataclass
class CartLineIn:
    pack_option_id: int
    quantity: int
    price_paise: int


@dataclass
class CustomerDetails:
    name: str
    phone: str
    delivery_area_id: int | None
    address: str
    landmark: str
    note: str
    payment_method: str


def normalise_phone(typed: str) -> str | None:
    """A 10-digit Indian mobile number from "+91 98765 43210", "098765-43210" and the like, or None."""
    digits = re.sub(r"[\s\-()]", "", typed)
    if digits.startswith("+91"):
        digits = digits[3:]
    elif len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    return digits if re.fullmatch(r"[6-9]\d{9}", digits) else None


def customer_errors(details: CustomerDetails) -> dict[str, str]:
    errors = {}
    if not details.name.strip():
        errors["name"] = "Enter your name."
    if normalise_phone(details.phone) is None:
        errors["phone"] = "Enter a 10-digit mobile number."
    if not DeliveryArea.objects.filter(id=details.delivery_area_id, is_active=True).exists():
        errors["delivery_area_id"] = "Choose your area."
    if not details.address.strip():
        errors["address"] = "Enter your address."
    if details.payment_method not in Order.PaymentMethod.values:
        errors["payment_method"] = "Choose Cash or UPI."
    return errors


def lines_error(lines: list[CartLineIn]) -> str | None:
    if not lines:
        return "Your cart is empty."
    if any(line.quantity < 1 for line in lines):
        return "Every item needs a quantity of at least 1."
    if len({line.pack_option_id for line in lines}) != len(lines):
        return "An item is in the cart twice."
    return None


def all_orderable(lines: list[CartLineIn]) -> bool:
    """Whether every line's Pack Option is shown to customers and in stock."""
    orderable = PackOption.objects.filter(
        id__in=[line.pack_option_id for line in lines],
        is_visible=True,
        in_stock=True,
        product__is_visible=True,
        product__category__is_visible=True,
    )
    return orderable.count() == len(lines)


def is_first_time_customer(phone: str) -> bool:
    return not Order.objects.filter(phone=phone, status=Order.Status.DELIVERED).exists()


@transaction.atomic
def place_order(details: CustomerDetails, lines: list[CartLineIn]) -> Order:
    """Creates the Order at server prices. Price and stock checks against what the customer saw come in ticket 10."""
    now = timezone.now()
    shop = ShopSettings.load()
    phone = normalise_phone(details.phone)
    options = PackOption.objects.select_related("product").in_bulk([line.pack_option_id for line in lines])
    ordered = [(options[line.pack_option_id], line.quantity) for line in lines]
    original = [
        {
            "pack_option_id": option.id,
            "product_name": option.product.name,
            "pack_label": option.label,
            "unit_price_paise": option.price_paise,
            "quantity": quantity,
        }
        for option, quantity in ordered
    ]
    subtotal = sum(option.price_paise * quantity for option, quantity in ordered)
    status = Order.Status.NEW if is_first_time_customer(phone) else Order.Status.CONFIRMED
    order = Order.objects.create(
        status=status,
        customer_name=details.name.strip(),
        phone=phone,
        delivery_area_id=details.delivery_area_id,
        address=details.address.strip(),
        landmark=details.landmark.strip(),
        note=details.note.strip(),
        payment_method=details.payment_method,
        delivery_charge_paise=shop.delivery_charge_paise,
        total_paise=subtotal + shop.delivery_charge_paise,
        original_request=original,
        is_after_hours=not shop.is_open_at(now),
    )
    OrderLine.objects.bulk_create(
        OrderLine(
            order=order,
            pack_option=option,
            product_name=option.product.name,
            pack_label=option.label,
            unit_price_paise=option.price_paise,
            quantity=quantity,
            position=position,
        )
        for position, (option, quantity) in enumerate(ordered)
    )
    StatusChange.objects.create(order=order, status=status, changed_at=order.created_at)
    return order
