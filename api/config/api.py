from ninja import NinjaAPI

from shop.api import router as shop_router

api = NinjaAPI(title="Supermarket delivery API")
api.add_router("/shop", shop_router)
