"""Staff edits to an Order's lines while it is New or Confirmed."""

from dataclasses import dataclass

from django.db import transaction

from catalog.models import PackOption
from orders.models import Order, OrderLine

EDITABLE = {Order.Status.NEW, Order.Status.CONFIRMED}


class EditNotAllowed(Exception):
    """The Order has moved on, so its lines are final."""


class InvalidLines(Exception):
    """The new lines can't be saved; the message says why."""


@dataclass
class LineIn:
    pack_option_id: int
    quantity: int


def edit_lines(order: Order, lines: list[LineIn]) -> Order:
    """Replaces the Order's lines with `lines`, in that order, and recalculates the total.

    A line whose Pack Option is already on the Order keeps the name, label and price it was added at; any other
    Pack Option (an addition or a swap) is copied at its current price. The Original Request is never touched.
    """
    if not lines:
        raise InvalidLines("An order needs at least one item. Cancel the order instead.")
    if any(line.quantity < 1 for line in lines):
        raise InvalidLines("Every item needs a quantity of at least 1.")
    if len({line.pack_option_id for line in lines}) != len(lines):
        raise InvalidLines("An item is in the order twice.")
    with transaction.atomic():
        # Locked so an edit and a status change (or two edits) can't interleave.
        locked = Order.objects.select_for_update().get(pk=order.pk)
        if locked.status not in EDITABLE:
            raise EditNotAllowed(f"This order is {locked.get_status_display().lower()} and its items can no longer be changed.")
        existing = {line.pack_option_id: line for line in locked.lines.all()}
        new_ids = [line.pack_option_id for line in lines if line.pack_option_id not in existing]
        options = (
            PackOption.objects.select_related("product")
            .filter(is_visible=True, product__is_visible=True, product__category__is_visible=True)
            .in_bulk(new_ids)
        )
        if len(options) != len(new_ids):
            raise InvalidLines("One of the items is no longer available. Reload the page and try again.")
        locked.lines.all().delete()
        OrderLine.objects.bulk_create(
            order_line(locked, line, position, existing.get(line.pack_option_id), options.get(line.pack_option_id))
            for position, line in enumerate(lines)
        )
        subtotal = sum(line.total_paise for line in locked.lines.all())
        locked.total_paise = subtotal + locked.delivery_charge_paise
        locked.save(update_fields=["total_paise"])
    return locked


def order_line(order: Order, line: LineIn, position: int, kept: OrderLine | None, option: PackOption | None) -> OrderLine:
    """A line already on the Order keeps what it was added with; a new one is copied from its Pack Option."""
    return OrderLine(
        order=order,
        pack_option_id=line.pack_option_id,
        product_name=kept.product_name if kept else option.product.name,
        pack_label=kept.pack_label if kept else option.label,
        unit_price_paise=kept.unit_price_paise if kept else option.price_paise,
        quantity=line.quantity,
        position=position,
    )
