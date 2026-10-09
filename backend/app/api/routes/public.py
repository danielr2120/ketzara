from fastapi import APIRouter, status

from app.api.deps import DbSession
from app.core.constants import CANCELLED_STATUS, ORDER_STATUSES
from app.models import Order
from app.schemas.common import Option
from app.schemas.order import PublicOrderCreated, PublicOrderIn, PublicOrderItem, PublicOrderOut
from app.schemas.product import PublicProductOut
from app.services import order_service, product_service

router = APIRouter(prefix="/public", tags=["public"])


def _public_view(order: Order) -> PublicOrderOut:
    return PublicOrderOut(
        order_number=order.order_number,
        created_at=order.created_at,
        updated_at=order.updated_at,
        status=order.status,
        status_label=ORDER_STATUSES.get(order.status, order.status),
        steps=[Option(value=k, label=v) for k, v in ORDER_STATUSES.items() if k != CANCELLED_STATUS],
        items=[PublicOrderItem.model_validate(i) for i in order.items],
        shipping_cost=order.shipping_cost,
        total=order.total,
    )


@router.get("/products", response_model=list[PublicProductOut])
def list_products(db: DbSession):
    return product_service.list_available_products(db)


@router.post("/orders", response_model=PublicOrderCreated, status_code=status.HTTP_201_CREATED)
def create_order(data: PublicOrderIn, db: DbSession):
    order = order_service.create_public_order(db, data)
    return PublicOrderCreated(**_public_view(order).model_dump(), tracking_code=order.tracking_code)


@router.get("/orders/{tracking_code}", response_model=PublicOrderOut)
def track_order(tracking_code: str, db: DbSession):
    return _public_view(order_service.get_order_by_tracking_code(db, tracking_code))
