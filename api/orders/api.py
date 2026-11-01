from datetime import datetime
from typing import Literal

from django.db import transaction
from django.shortcuts import get_object_or_404
from ninja import Router, Schema
from ninja.responses import Status

from orders.checkout import (
    CartLineIn,
    CustomerDetails,
    cart_changes,
    customer_errors,
    lines_error,
    minimum_order_error,
    normalise_phone,
    over_hourly_limit,
    place_order,
)
from orders.models import Order
from shop.models import ShopSettings

router = Router(tags=["orders"])

FIX_ERRORS = "Please fix the errors below."


class CartLineSchema(Schema):
    pack_option_id: int
    quantity: int
    price_paise: int


class CheckoutIn(Schema):
    # Strings default to empty so a missing field is reported next to it rather than as a schema error.
    name: str = ""
    phone: str = ""
    delivery_area_id: int | None = None
    address: str = ""
    landmark: str = ""
    note: str = ""
    payment_method: str = ""
    lines: list[CartLineSchema] = []


class Placed(Schema):
    number: int
    token: str


class Problem(Schema):
    detail: str
    errors: dict[str, str] = {}


class Change(Schema):
    pack_option_id: int
    kind: Literal["price_changed", "out_of_stock", "unavailable"]
    old_price_paise: int | None
    new_price_paise: int | None


class Changes(Schema):
    detail: str
    changes: list[Change]


@router.post("/checkout", response={201: Placed, 409: Changes, 422: Problem, 429: Problem}, auth=None)
def checkout(request, data: CheckoutIn):
    """Places an Order from the Cart and customer details, or says what stops it, in the spec's order of checks."""
    details = CustomerDetails(**data.dict(exclude={"lines"}))
    lines = [CartLineIn(**line.dict()) for line in data.lines]
    if errors := customer_errors(details):
        return Status(422, {"detail": FIX_ERRORS, "errors": errors})
    if error := lines_error(lines):
        return Status(422, {"detail": error})
    with transaction.atomic():
        # Locking the one Shop Settings row runs checkouts one at a time, so a price can't change and a second
        # order from the same phone can't land between the checks below and creating the Order.
        ShopSettings.load()
        shop = ShopSettings.objects.select_for_update().get(id=ShopSettings.SINGLETON_ID)
        return checked_checkout(details, lines, shop)


def checked_checkout(details: CustomerDetails, lines: list[CartLineIn], shop: ShopSettings):
    if over_hourly_limit(normalise_phone(details.phone), shop):
        limit = shop.orders_per_hour_limit
        return Status(429, {"detail": f"This phone number has reached the limit of {limit} orders an hour. Please try again later, or call the shop."})
    if changes := cart_changes(lines):
        return Status(409, {"detail": "Some items changed since you added them.", "changes": changes})
    if error := minimum_order_error(lines, shop):
        return Status(422, {"detail": error})
    order = place_order(details, lines)
    return Status(201, {"number": order.number, "token": order.public_token})


class TimelineStep(Schema):
    status: str
    at: datetime


class StatusLine(Schema):
    product_name: str
    pack_label: str
    unit_price_paise: int
    quantity: int
    line_total_paise: int


class OrderStatus(Schema):
    number: int
    status: str
    placed_at: datetime
    timeline: list[TimelineStep]
    lines: list[StatusLine]
    subtotal_paise: int
    delivery_charge_paise: int
    total_paise: int
    payment_method: str
    shop_phone: str
    # For an Order placed outside delivery hours: when delivery starts, in the shop's timezone.
    delivery_from: datetime | None


@router.get("/{token}", response=OrderStatus, auth=None)
def order_status(request, token: str):
    """One Order's status page data, found by its public token."""
    order = get_object_or_404(Order.objects.prefetch_related("lines", "status_changes"), public_token=token)
    shop = ShopSettings.load()
    lines = order.lines.all()
    return {
        "number": order.number,
        "status": order.status,
        "placed_at": order.created_at,
        "timeline": [{"status": change.status, "at": change.changed_at} for change in order.status_changes.all()],
        "lines": [
            {
                "product_name": line.product_name,
                "pack_label": line.pack_label,
                "unit_price_paise": line.unit_price_paise,
                "quantity": line.quantity,
                "line_total_paise": line.total_paise,
            }
            for line in lines
        ],
        "subtotal_paise": sum(line.total_paise for line in lines),
        "delivery_charge_paise": order.delivery_charge_paise,
        "total_paise": order.total_paise,
        "payment_method": order.payment_method,
        "shop_phone": shop.phone,
        "delivery_from": shop.next_opening_after(order.created_at) if order.is_after_hours else None,
    }
