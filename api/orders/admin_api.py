from datetime import datetime

from django.db.models import Exists, OuterRef
from django.shortcuts import get_object_or_404
from ninja import Router, Schema
from ninja.pagination import PageNumberPagination, paginate
from ninja.security import django_auth

from orders.api import Problem
from orders.models import Order, StatusChange
from orders.status import NotAllowed, change_status

# Every admin endpoint needs a staff session; django_auth also checks the CSRF token on writes.
router = Router(tags=["admin orders"], auth=django_auth)

ORDER_PAGE_SIZE = 25


class OrderSummary(Schema):
    number: int
    customer_name: str
    area: str
    total_paise: int
    placed_at: datetime
    status: Order.Status
    is_after_hours: bool
    # From a First-Time Customer: no earlier Delivered Order from the same phone.
    call_to_confirm: bool

    @staticmethod
    def resolve_area(order: Order) -> str:
        return order.delivery_area.name

    @staticmethod
    def resolve_placed_at(order: Order) -> datetime:
        return order.created_at

    @staticmethod
    def resolve_call_to_confirm(order: Order) -> bool:
        return not order.has_earlier_delivery


class OrderLineOut(Schema):
    product_name: str
    pack_label: str
    unit_price_paise: int
    quantity: int
    line_total_paise: int

    @staticmethod
    def resolve_line_total_paise(line) -> int:
        return line.total_paise


class HistoryEntry(Schema):
    status: Order.Status
    at: datetime
    # The Staff Member's username, or "customer" for checkout and cancelling through the Status Link.
    by: str

    @staticmethod
    def resolve_at(change: StatusChange) -> datetime:
        return change.changed_at

    @staticmethod
    def resolve_by(change: StatusChange) -> str:
        return change.changed_by.username if change.changed_by else "customer"


class OrderDetail(OrderSummary):
    phone: str
    address: str
    landmark: str
    note: str
    payment_method: str
    lines: list[OrderLineOut]
    subtotal_paise: int
    delivery_charge_paise: int
    history: list[HistoryEntry]

    @staticmethod
    def resolve_history(order: Order) -> list:
        return list(order.status_changes.all())

    @staticmethod
    def resolve_lines(order: Order) -> list:
        return list(order.lines.all())

    @staticmethod
    def resolve_subtotal_paise(order: Order) -> int:
        return sum(line.total_paise for line in order.lines.all())


def orders():
    earlier_delivery = Order.objects.filter(phone=OuterRef("phone"), id__lt=OuterRef("id"), status=Order.Status.DELIVERED)
    return Order.objects.select_related("delivery_area").annotate(has_earlier_delivery=Exists(earlier_delivery)).order_by("-id")


@router.get("/orders", response=list[OrderSummary])
@paginate(PageNumberPagination, page_size=ORDER_PAGE_SIZE, max_page_size=ORDER_PAGE_SIZE)
def list_orders(request, status: Order.Status | None = None):
    """Every Order, newest first, optionally with one status."""
    found = orders()
    if status is not None:
        found = found.filter(status=status)
    return found


class OrderChanges(Schema):
    # Pass back as `after` on the next poll.
    cursor: int
    placed: list[OrderSummary]
    # Cancelled by the customer through the Status Link; staff cancelling doesn't need an alert.
    cancelled: list[OrderSummary]
    # Every Order with any status change, so the list can refresh those rows.
    updated: list[int]


@router.get("/orders/changes", response=OrderChanges)
def order_changes(request, after: int | None = None):
    """Orders placed or cancelled since the cursor. Without one, just the current cursor to start from."""
    latest = StatusChange.objects.order_by("-id").values_list("id", flat=True).first() or 0
    if after is None:
        return {"cursor": latest, "placed": [], "cancelled": [], "updated": []}
    changes = list(StatusChange.objects.filter(id__gt=after, id__lte=latest).order_by("id"))
    placed = [change.order_id for change in changes if change.status == Order.Status.NEW]
    cancelled = [
        change.order_id for change in changes if change.status == Order.Status.CANCELLED and change.changed_by_id is None
    ]
    found = {order.id: order for order in orders().filter(id__in=placed + cancelled)}
    return {
        "cursor": latest,
        "placed": [found[number] for number in placed],
        "cancelled": [found[number] for number in cancelled],
        "updated": list(dict.fromkeys(change.order_id for change in changes)),
    }


class StatusIn(Schema):
    status: Order.Status


def order_detail(number: int) -> Order:
    return get_object_or_404(orders().prefetch_related("lines", "status_changes__changed_by"), id=number)


@router.get("/orders/{number}", response=OrderDetail)
def get_order(request, number: int):
    return order_detail(number)


@router.post("/orders/{number}/status", response={200: OrderDetail, 409: Problem})
def set_status(request, number: int, data: StatusIn):
    """Moves the Order one step on, or cancels it; anything else is a 409."""
    order = get_object_or_404(Order, id=number)
    try:
        change_status(order, data.status, by=request.user)
    except NotAllowed as error:
        return 409, {"detail": str(error)}
    return order_detail(number)
