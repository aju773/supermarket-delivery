"""Reorder: an Order's current lines at today's prices, with the ones that can't be ordered set aside."""

from orders.checkout import on_sale_options
from orders.models import Order


def reorder_lookup(order: Order) -> dict:
    """The lines to put back in the Cart at current prices, and `skipped` for those hidden or out of stock."""
    lines = list(order.lines.select_related("pack_option__product"))
    on_sale = on_sale_options().in_bulk([line.pack_option_id for line in lines])
    orderable, skipped = [], []
    for line in lines:
        option = on_sale.get(line.pack_option_id)
        if option is not None and option.in_stock:
            product = line.pack_option.product
            orderable.append(
                {
                    "pack_option_id": option.id,
                    "product_id": product.id,
                    "product_name": product.name,
                    "pack_label": option.label,
                    "price_paise": option.price_paise,
                    "quantity": line.quantity,
                    "thumbnail_url": product.thumbnail.url if product.thumbnail else None,
                }
            )
        else:
            reason = "unavailable" if option is None else "out_of_stock"
            skipped.append({"product_name": line.product_name, "pack_label": line.pack_label, "reason": reason})
    return {"lines": orderable, "skipped": skipped}
