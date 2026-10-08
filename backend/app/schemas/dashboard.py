from pydantic import BaseModel

from app.schemas.common import Money
from app.schemas.order import OrderSummary


class DashboardSummary(BaseModel):
    orders_today: int
    pending_orders: int
    delivered_this_month: int
    sales_today: Money
    sales_this_month: Money
    recent_orders: list[OrderSummary]
