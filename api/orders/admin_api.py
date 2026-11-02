from datetime import datetime, time, timedelta

from django.db.models import Count, Exists, OuterRef, Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Router, Schema
from ninja.pagination import PageNumberPagination, paginate
from ninja.responses import Status
from ninja.security import django_auth

from orders.api import Problem
from orders.edits import EditNotAllowed, InvalidLines, LineIn, edit_lines
from orders.models import Order, StatusChange
from orders.status import NotAllowed, change_status
from shop.models import ShopSettings

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
    pack_option_id: int
    product_name: str
    pack_label: str
    unit_price_paise: int
    quantity: int
    line_total_paise: int

    @staticmethod
    def resolve_line_total_paise(line) -> int:
        return line.total_paise


class OriginalLine(Schema):
    pack_option_id: int
    product_name: str
    pack_label: str
    unit_price_paise: int
    quantity: int


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
    # What the customer submitted, never changed by edits.
    original_request: list[OriginalLine]
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


# StatusChange ids come from a sequence when the row is inserted, not when it commits, so a lower id can
# show up after a higher one. A missing id is waited for until it is this old; by then it was rolled back.
IN_FLIGHT_FOR = timedelta(seconds=10)


def settled_changes(after: int, now: datetime) -> list[StatusChange]:
    """Changes after `after`, stopping at the first missing id that may still be committing."""
    found = []
    expected = after + 1
    for change in StatusChange.objects.filter(id__gt=after).order_by("id"):
        if change.id != expected and change.changed_at > now - IN_FLIGHT_FOR:
            break
        found.append(change)
        expected = change.id + 1
    return found


@router.get("/orders/changes", response=OrderChanges)
def order_changes(request, after: int | None = None):
    """Orders placed or cancelled since the cursor. Without one, just the current cursor to start from."""
    now = timezone.now()
    if after is None:
        old = StatusChange.objects.filter(changed_at__lte=now - IN_FLIGHT_FOR).order_by("-id").first()
        after = old.id if old else 0
        changes = settled_changes(after, now)
        return {"cursor": changes[-1].id if changes else after, "placed": [], "cancelled": [], "updated": []}
    changes = settled_changes(after, now)
    placed = [change.order_id for change in changes if change.status == Order.Status.NEW]
    cancelled = [
        change.order_id for change in changes if change.status == Order.Status.CANCELLED and change.changed_by_id is None
    ]
    found = {order.id: order for order in orders().filter(id__in=placed + cancelled)}
    return {
        "cursor": changes[-1].id if changes else after,
        "placed": [found[number] for number in placed],
        "cancelled": [found[number] for number in cancelled],
        "updated": list(dict.fromkeys(change.order_id for change in changes)),
    }


class OrdersSummary(Schema):
    orders_today: int
    sales_today_paise: int
    # Current statuses, whatever day the Order was placed.
    new: int
    out_for_delivery: int


@router.get("/orders/summary", response=OrdersSummary)
def orders_summary(request):
    """The numbers for the Orders page tiles; `new` is also the Orders badge. Today is the day in the shop timezone."""
    zone = ShopSettings.load().zone
    start = datetime.combine(timezone.now().astimezone(zone).date(), time.min, tzinfo=zone)
    today = Order.objects.filter(created_at__gte=start, created_at__lt=start + timedelta(days=1)).exclude(
        status=Order.Status.CANCELLED
    )
    totals = today.aggregate(count=Count("id"), sales=Sum("total_paise"))
    by_status = Order.objects.filter(status__in=[Order.Status.NEW, Order.Status.OUT_FOR_DELIVERY]).aggregate(
        new=Count("id", filter=Q(status=Order.Status.NEW)),
        out_for_delivery=Count("id", filter=Q(status=Order.Status.OUT_FOR_DELIVERY)),
    )
    return {"orders_today": totals["count"], "sales_today_paise": totals["sales"] or 0, **by_status}


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


class LineEdit(Schema):
    pack_option_id: int
    quantity: int


class LinesIn(Schema):
    lines: list[LineEdit]


@router.put("/orders/{number}/lines", response={200: OrderDetail, 409: Problem, 422: Problem})
def set_lines(request, number: int, data: LinesIn):
    """Replaces the Order's lines while it is New or Confirmed; new Pack Options are added at their current price."""
    order = get_object_or_404(Order, id=number)
    try:
        edit_lines(order, [LineIn(**line.dict()) for line in data.lines])
    except EditNotAllowed as error:
        return Status(409, {"detail": str(error)})
    except InvalidLines as error:
        return Status(422, {"detail": str(error)})
    return order_detail(number)
