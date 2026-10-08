from fastapi import APIRouter
from pydantic import BaseModel

from app.core.constants import ORDER_STATUSES, PAYMENT_METHODS
from app.schemas.common import Option

router = APIRouter(tags=["meta"])


class MetaOut(BaseModel):
    payment_methods: list[Option]
    order_statuses: list[Option]


@router.get("/meta", response_model=MetaOut)
def get_meta():
    return MetaOut(
        payment_methods=[Option(value=k, label=v) for k, v in PAYMENT_METHODS.items()],
        order_statuses=[Option(value=k, label=v) for k, v in ORDER_STATUSES.items()],
    )
