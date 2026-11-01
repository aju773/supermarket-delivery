from ninja import NinjaAPI

from shop.admin_api import router as shop_admin_router
from shop.api import router as shop_router
from staff.api import router as staff_router

api = NinjaAPI(title="Supermarket delivery API")
api.add_router("/shop", shop_router)
api.add_router("/admin/auth", staff_router)
api.add_router("/admin", shop_admin_router)
