from fastapi import APIRouter

from app.api.deps import DbSession
from app.core.constants import CANCELLED_STATUS, ORDER_STATUSES
from app.schemas.common import Option
from app.schemas.order import PublicOrderItem, PublicOrderOut
from app.services import order_service

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/orders/{tracking_code}", response_model=PublicOrderOut)
def track_order(tracking_code: str, db: DbSession):
    order = order_service.get_order_by_tracking_code(db, tracking_code)
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
