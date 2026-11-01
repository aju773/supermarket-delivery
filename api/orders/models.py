import secrets

from django.conf import settings
from django.db import models

from catalog.models import PackOption
from shop.models import DeliveryArea


def new_public_token() -> str:
    return secrets.token_urlsafe(32)


class Order(models.Model):
    """A submitted Cart plus customer details. Its number is short and sequential; its public token is the Status Link."""

    class Status(models.TextChoices):
        NEW = "new", "New"
        CONFIRMED = "confirmed", "Confirmed"
        OUT_FOR_DELIVERY = "out_for_delivery", "Out for delivery"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"

    class PaymentMethod(models.TextChoices):
        CASH = "cash", "Cash"
        UPI = "upi", "UPI"

    public_token = models.CharField(max_length=64, unique=True, default=new_public_token)
    status = models.CharField(max_length=20, choices=Status.choices)
    customer_name = models.CharField(max_length=100)
    # Normalised 10-digit Indian mobile number.
    phone = models.CharField(max_length=10, db_index=True)
    delivery_area = models.ForeignKey(DeliveryArea, on_delete=models.PROTECT, related_name="orders")
    address = models.TextField()
    landmark = models.CharField(max_length=200, blank=True)
    note = models.TextField(blank=True)
    payment_method = models.CharField(max_length=10, choices=PaymentMethod.choices)
    delivery_charge_paise = models.PositiveIntegerField()
    total_paise = models.PositiveIntegerField()
    # The lines exactly as the customer submitted them, never changed by staff edits.
    original_request = models.JSONField()
    is_after_hours = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]

    def __str__(self) -> str:
        return f"Order {self.number}"

    @property
    def number(self) -> int:
        return self.id


class OrderLine(models.Model):
    """One Pack Option and quantity on an Order, with the name, pack label and unit price copied when added."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="lines")
    # Protected: Pack Options (and so Products) on any Order are hidden, never deleted.
    pack_option = models.ForeignKey(PackOption, on_delete=models.PROTECT, related_name="order_lines")
    product_name = models.CharField(max_length=200)
    pack_label = models.CharField(max_length=50)
    unit_price_paise = models.PositiveIntegerField()
    quantity = models.PositiveIntegerField()
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["position", "id"]

    @property
    def total_paise(self) -> int:
        return self.unit_price_paise * self.quantity


class StatusChange(models.Model):
    """One entry in an Order's status history. No staff member means the customer (or checkout) made it."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="status_changes")
    status = models.CharField(max_length=20, choices=Order.Status.choices)
    changed_at = models.DateTimeField()
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True)

    class Meta:
        ordering = ["changed_at", "id"]
