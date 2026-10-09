from fastapi import APIRouter, Depends

from app.api.deps import require_admin
from app.api.routes import auth, customers, dashboard, meta, orders, products, public

api_router = APIRouter()


@api_router.get("/health", tags=["health"])
def health():
    return {"status": "ok"}


# Rutas abiertas: las usan las páginas para clientes (/pedir y /seguimiento) y el inicio de sesión.
api_router.include_router(auth.router)
api_router.include_router(public.router)
api_router.include_router(meta.router)

# Administración: requieren haber iniciado sesión.
admin_router = APIRouter(dependencies=[Depends(require_admin)])
admin_router.include_router(dashboard.router)
admin_router.include_router(customers.router)
admin_router.include_router(products.router)
admin_router.include_router(orders.router)
api_router.include_router(admin_router)
