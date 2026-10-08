from fastapi import APIRouter, Query, status

from app.api.deps import DbSession
from app.schemas.product import ProductIn, ProductOut
from app.services import product_service

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductOut])
def list_products(
    db: DbSession,
    active: bool | None = None,
    search: str | None = Query(None, max_length=100),
):
    return product_service.list_products(db, active=active, search=search)


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(data: ProductIn, db: DbSession):
    return product_service.create_product(db, data)


@router.put("/{product_id}", response_model=ProductOut)
def update_product(product_id: int, data: ProductIn, db: DbSession):
    return product_service.update_product(db, product_id, data)
