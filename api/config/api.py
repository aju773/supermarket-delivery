from ninja import NinjaAPI

from catalog.admin_api import router as catalog_admin_router
from catalog.api import router as catalog_router
from orders.admin_api import router as orders_admin_router
from orders.api import router as orders_router
from shop.admin_api import router as shop_admin_router
from shop.api import router as shop_router
from staff.accounts_api import router as staff_accounts_router
from staff.api import router as staff_router
from staff.search_api import router as search_router

api = NinjaAPI(title="Supermarket delivery API")
api.add_router("/shop", shop_router)
api.add_router("/catalog", catalog_router)
api.add_router("/orders", orders_router)
api.add_router("/admin/auth", staff_router)
api.add_router("/admin", shop_admin_router)
api.add_router("/admin", catalog_admin_router)
api.add_router("/admin", orders_admin_router)
api.add_router("/admin", search_router)
api.add_router("/admin", staff_accounts_router)
