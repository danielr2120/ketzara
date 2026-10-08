from fastapi import APIRouter

from app.api.routes import customers, dashboard, meta, orders, products, public

api_router = APIRouter()


@api_router.get("/health", tags=["health"])
def health():
    return {"status": "ok"}


api_router.include_router(public.router)
api_router.include_router(meta.router)
api_router.include_router(dashboard.router)
api_router.include_router(customers.router)
api_router.include_router(products.router)
api_router.include_router(orders.router)
