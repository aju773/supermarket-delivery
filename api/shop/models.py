from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo, available_timezones

from django.core.exceptions import ValidationError
from django.db import models


def validate_timezone(value: str) -> None:
    if value not in available_timezones():
        raise ValidationError(f"{value} is not a known timezone.")


class ShopSettings(models.Model):
    """The one settings record for the shop. Money is in whole paise; times are in the shop's timezone."""

    SINGLETON_ID = 1

    minimum_order_paise = models.PositiveIntegerField(default=20000)
    delivery_charge_paise = models.PositiveIntegerField(default=2000)
    opening_time = models.TimeField(default=time(8))
    closing_time = models.TimeField(default=time(21))
    phone = models.CharField(max_length=20, blank=True, default="")
    orders_per_hour_limit = models.PositiveIntegerField(default=3)
    timezone = models.CharField(max_length=64, default="Asia/Kolkata", validators=[validate_timezone])

    class Meta:
        verbose_name_plural = "shop settings"
        constraints = [
            models.CheckConstraint(condition=models.Q(id=1), name="shop_settings_singleton"),
        ]

    @classmethod
    def load(cls) -> "ShopSettings":
        settings, _ = cls.objects.get_or_create(id=cls.SINGLETON_ID)
        return settings

    def save(self, *args, **kwargs):
        self.id = self.SINGLETON_ID
        super().save(*args, **kwargs)

    @property
    def zone(self) -> ZoneInfo:
        return ZoneInfo(self.timezone)

    def is_open_at(self, moment: datetime) -> bool:
        """Delivery hours include the opening minute and exclude the closing minute.

        A closing time earlier than the opening time means the hours run past midnight;
        equal times mean the shop never closes.
        """
        now = moment.astimezone(self.zone).time()
        if self.opening_time < self.closing_time:
            return self.opening_time <= now < self.closing_time
        if self.opening_time > self.closing_time:
            return now >= self.opening_time or now < self.closing_time
        return True

    def next_opening_after(self, moment: datetime) -> datetime | None:
        """When the shop next opens, in the shop's timezone, or None if it is open at `moment`."""
        if self.is_open_at(moment):
            return None
        local = moment.astimezone(self.zone)
        opening = datetime.combine(local.date(), self.opening_time, tzinfo=self.zone)
        if opening <= local:
            opening = datetime.combine(local.date() + timedelta(days=1), self.opening_time, tzinfo=self.zone)
        return opening
