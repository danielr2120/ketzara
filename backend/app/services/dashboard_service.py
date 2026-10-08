from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.core.constants import CANCELLED_STATUS, DEFAULT_ORDER_STATUS, DELIVERED_STATUS
from app.models import Order
from app.services import order_service


def get_summary(db: Session, tz: ZoneInfo, recent_limit: int = 8) -> dict:
    now = datetime.now(tz)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today_start.replace(day=1)

    is_today = Order.created_at >= today_start
    is_this_month = Order.created_at >= month_start
    is_sale = Order.status != CANCELLED_STATUS

    row = db.execute(
        select(
            func.count().filter(is_today).label("orders_today"),
            func.count().filter(Order.status == DEFAULT_ORDER_STATUS).label("pending_orders"),
            func.count()
            .filter(and_(Order.status == DELIVERED_STATUS, is_this_month))
            .label("delivered_this_month"),
            func.coalesce(func.sum(Order.total).filter(and_(is_sale, is_today)), 0).label("sales_today"),
            func.coalesce(func.sum(Order.total).filter(and_(is_sale, is_this_month)), 0).label(
                "sales_this_month"
            ),
        ).select_from(Order)
    ).mappings().one()

    recent = order_service.list_orders(
        db, order_service.OrderFilters(), tz, page=1, page_size=recent_limit
    )
    return {**row, "recent_orders": recent["items"]}
