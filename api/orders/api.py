from datetime import datetime

from django.shortcuts import get_object_or_404
from ninja import Router, Schema
from ninja.responses import Status

from orders.checkout import CartLineIn, CustomerDetails, all_orderable, customer_errors, lines_error, place_order
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


@router.post("/checkout", response={201: Placed, 422: Problem}, auth=None)
def checkout(request, data: CheckoutIn):
    """Places an Order from the Cart and customer details, or returns field errors."""
    details = CustomerDetails(**data.dict(exclude={"lines"}))
    lines = [CartLineIn(**line.dict()) for line in data.lines]
    if errors := customer_errors(details):
        return Status(422, {"detail": FIX_ERRORS, "errors": errors})
    if error := lines_error(lines):
        return Status(422, {"detail": error})
    if not all_orderable(lines):
        return Status(422, {"detail": "Some items in your cart can no longer be ordered. Go back to the cart and remove them."})
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
