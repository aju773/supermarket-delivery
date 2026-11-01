"""Moving an Order between statuses, and who may make each move."""

from django.db import transaction
from django.utils import timezone

from orders.models import Order, StatusChange

Status = Order.Status

# Staff move an Order forward one step at a time, or cancel it before it is delivered.
STAFF_MOVES = {
    Status.NEW: {Status.CONFIRMED, Status.CANCELLED},
    Status.CONFIRMED: {Status.OUT_FOR_DELIVERY, Status.CANCELLED},
    Status.OUT_FOR_DELIVERY: {Status.DELIVERED, Status.CANCELLED},
}

# The customer can only cancel, and only before the Order leaves the shop.
CUSTOMER_MOVES = {
    Status.NEW: {Status.CANCELLED},
    Status.CONFIRMED: {Status.CANCELLED},
}


class NotAllowed(Exception):
    pass


def change_status(order: Order, to: Status, by=None) -> Order:
    """Moves the Order to `to` and records it in the history. `by` is a Staff Member; None means the customer."""
    moves = STAFF_MOVES if by is not None else CUSTOMER_MOVES
    with transaction.atomic():
        # Locked so two taps (or staff and customer at once) can't both move it from the same status.
        locked = Order.objects.select_for_update().get(pk=order.pk)
        if to not in moves.get(locked.status, set()):
            raise NotAllowed(
                f"This order is {locked.get_status_display().lower()} and can't be "
                f"{'cancelled' if to == Status.CANCELLED else f'moved to {Status(to).label.lower()}'}."
            )
        locked.status = to
        locked.save(update_fields=["status"])
        StatusChange.objects.create(order=locked, status=to, changed_at=timezone.now(), changed_by=by)
    order.status = locked.status
    return order
