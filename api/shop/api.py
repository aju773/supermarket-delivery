from datetime import datetime

from django.conf import settings
from django.utils import timezone
from ninja import Router, Schema

from shop.models import ShopSettings

router = Router(tags=["shop"])


class ShopInfo(Schema):
    name: str
    phone: str
    minimum_order_paise: int
    delivery_charge_paise: int
    opening_time: str
    closing_time: str
    timezone: str
    is_open: bool
    next_opening_at: datetime | None


@router.get("", response=ShopInfo, auth=None)
def shop_info(request):
    """What the customer site needs to show the shop's name, rules and whether it is open now."""
    shop_settings = ShopSettings.load()
    now = timezone.now()
    return ShopInfo(
        name=settings.SHOP_NAME,
        phone=shop_settings.phone,
        minimum_order_paise=shop_settings.minimum_order_paise,
        delivery_charge_paise=shop_settings.delivery_charge_paise,
        opening_time=shop_settings.opening_time.strftime("%H:%M"),
        closing_time=shop_settings.closing_time.strftime("%H:%M"),
        timezone=shop_settings.timezone,
        is_open=shop_settings.is_open_at(now),
        next_opening_at=shop_settings.next_opening_after(now),
    )
