from datetime import date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status

from app.api.deps import DbSession
from app.core.config import get_settings
from app.schemas.order import OrderIn, OrderOut, OrderPage, OrderStatusIn
from app.services import export_service, order_service

router = APIRouter(prefix="/orders", tags=["orders"])

XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def order_filters(
    search: str | None = Query(None, max_length=100),
    status: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> order_service.OrderFilters:
    return order_service.OrderFilters(
        search=search, status=status or None, date_from=date_from, date_to=date_to
    )


Filters = Annotated[order_service.OrderFilters, Depends(order_filters)]


@router.get("", response_model=OrderPage)
def list_orders(
    db: DbSession,
    filters: Filters,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    return order_service.list_orders(db, filters, get_settings().tz, page, page_size)


@router.get("/export", response_class=Response)
def export_orders(db: DbSession, filters: Filters):
    tz = get_settings().tz
    orders = order_service.list_orders_for_export(db, filters, tz)
    filename = f"pedidos-{datetime.now(tz):%Y-%m-%d}.xlsx"
    return Response(
        content=export_service.build_orders_workbook(orders, tz),
        media_type=XLSX_MEDIA_TYPE,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(data: OrderIn, db: DbSession):
    return order_service.create_order(db, data)


@router.get("/number/{order_number}", response_model=OrderOut)
def get_order_by_number(order_number: str, db: DbSession):
    return order_service.get_order_by_number(db, order_number)


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: DbSession):
    return order_service.get_order(db, order_id)


@router.put("/{order_id}", response_model=OrderOut)
def update_order(order_id: int, data: OrderIn, db: DbSession):
    return order_service.update_order(db, order_id, data)


@router.patch("/{order_id}/status", response_model=OrderOut)
def change_order_status(order_id: int, data: OrderStatusIn, db: DbSession):
    return order_service.change_status(db, order_id, data.status)
