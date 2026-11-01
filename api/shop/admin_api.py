from datetime import time

from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from ninja import Router, Schema, Status
from ninja.security import django_auth

from shop.models import DeliveryArea, ShopSettings

# Every admin endpoint needs a staff session; django_auth also checks the CSRF token on writes.
router = Router(tags=["admin settings"], auth=django_auth)

FIX_ERRORS = "Please fix the errors below."
DUPLICATE_NAME = "There is already an area with this name."


class SettingsIn(Schema):
    minimum_order_paise: int
    delivery_charge_paise: int
    opening_time: time
    closing_time: time
    phone: str
    orders_per_hour_limit: int


class SettingsOut(Schema):
    minimum_order_paise: int
    delivery_charge_paise: int
    opening_time: str
    closing_time: str
    phone: str
    orders_per_hour_limit: int


class AreaName(Schema):
    name: str


class AreaChange(Schema):
    name: str | None = None
    is_active: bool | None = None


class AreaOut(Schema):
    id: int
    name: str
    is_active: bool


class AreaOrder(Schema):
    ids: list[int]


def settings_out(shop_settings: ShopSettings) -> SettingsOut:
    return SettingsOut(
        minimum_order_paise=shop_settings.minimum_order_paise,
        delivery_charge_paise=shop_settings.delivery_charge_paise,
        opening_time=shop_settings.opening_time.strftime("%H:%M"),
        closing_time=shop_settings.closing_time.strftime("%H:%M"),
        phone=shop_settings.phone,
        orders_per_hour_limit=shop_settings.orders_per_hour_limit,
    )


def field_errors(errors: dict[str, str]) -> Status:
    return Status(400, {"detail": FIX_ERRORS, "errors": errors})


@router.get("/settings", response=SettingsOut)
def get_settings(request):
    return settings_out(ShopSettings.load())


@router.put("/settings", response={200: SettingsOut, 400: dict})
def update_settings(request, changes: SettingsIn):
    phone = changes.phone.strip()
    errors = {}
    if changes.minimum_order_paise < 0:
        errors["minimum_order_paise"] = "Can't be negative."
    if changes.delivery_charge_paise < 0:
        errors["delivery_charge_paise"] = "Can't be negative."
    if changes.closing_time <= changes.opening_time:
        errors["closing_time"] = "Must be after the opening time."
    if not phone:
        errors["phone"] = "Enter the shop phone number."
    if changes.orders_per_hour_limit < 1:
        errors["orders_per_hour_limit"] = "Must be at least 1."
    if errors:
        return field_errors(errors)

    shop_settings = ShopSettings.load()
    shop_settings.minimum_order_paise = changes.minimum_order_paise
    shop_settings.delivery_charge_paise = changes.delivery_charge_paise
    shop_settings.opening_time = changes.opening_time.replace(second=0, microsecond=0)
    shop_settings.closing_time = changes.closing_time.replace(second=0, microsecond=0)
    shop_settings.phone = phone
    shop_settings.orders_per_hour_limit = changes.orders_per_hour_limit
    shop_settings.save()
    return Status(200, settings_out(shop_settings))


def area_name_error(name: str, area: DeliveryArea | None = None) -> str | None:
    if not name:
        return "Enter the area name."
    others = DeliveryArea.objects.filter(name__iexact=name)
    if area is not None:
        others = others.exclude(id=area.id)
    if others.exists():
        return DUPLICATE_NAME
    return None


@router.get("/delivery-areas", response=list[AreaOut])
def list_areas(request):
    return DeliveryArea.objects.all()


@router.post("/delivery-areas", response={201: AreaOut, 400: dict})
def add_area(request, data: AreaName):
    name = data.name.strip()
    if error := area_name_error(name):
        return field_errors({"name": error})
    last = DeliveryArea.objects.order_by("-position").first()
    try:
        with transaction.atomic():
            area = DeliveryArea.objects.create(name=name, position=last.position + 1 if last else 0)
    except IntegrityError:  # Another request added the same name in the meantime.
        return field_errors({"name": DUPLICATE_NAME})
    return Status(201, area)


@router.put("/delivery-areas/order", response={200: list[AreaOut], 400: dict})
@transaction.atomic
def reorder_areas(request, order: AreaOrder):
    areas = {area.id: area for area in DeliveryArea.objects.select_for_update()}
    if len(order.ids) != len(set(order.ids)) or set(order.ids) != areas.keys():
        return Status(400, {"detail": "The list of areas has changed. Reload the page and try again."})
    for position, area_id in enumerate(order.ids):
        areas[area_id].position = position
    DeliveryArea.objects.bulk_update(areas.values(), ["position"])
    return Status(200, list(DeliveryArea.objects.all()))


@router.patch("/delivery-areas/{area_id}", response={200: AreaOut, 400: dict})
def change_area(request, area_id: int, change: AreaChange):
    area = get_object_or_404(DeliveryArea, id=area_id)
    if change.name is not None:
        name = change.name.strip()
        if error := area_name_error(name, area):
            return field_errors({"name": error})
        area.name = name
    if change.is_active is not None:
        area.is_active = change.is_active
    try:
        with transaction.atomic():
            area.save()
    except IntegrityError:
        return field_errors({"name": DUPLICATE_NAME})
    return Status(200, area)
