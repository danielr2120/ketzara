from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.core.constants import ORDER_STATUSES, PAYMENT_METHODS
from app.schemas.common import InputSchema, Money, MoneyInput, Option, OutputSchema, empty_to_none
from app.schemas.customer import CustomerIn, CustomerOut


def validate_status(value: str) -> str:
    if value not in ORDER_STATUSES:
        raise ValueError("Estado de pedido no válido")
    return value


def validate_payment_method(value: str) -> str:
    if value not in PAYMENT_METHODS:
        raise ValueError("Método de pago no válido")
    return value


class OrderItemIn(InputSchema):
    product_id: int | None = Field(default=None, gt=0)
    product_name: str | None = Field(default=None, max_length=150)
    quantity: int = Field(gt=0, le=100_000)
    # Si no se envía, se usa el precio actual del producto.
    unit_price: MoneyInput | None = None

    clean_optional_texts = field_validator("product_name")(empty_to_none)

    @model_validator(mode="after")
    def check_product(self):
        if self.product_id is None:
            if not self.product_name:
                raise ValueError("Selecciona un producto o escribe su nombre")
            if self.unit_price is None:
                raise ValueError("Indica el precio del producto")
        return self


class OrderIn(InputSchema):
    customer: CustomerIn
    items: list[OrderItemIn] = Field(min_length=1, max_length=50)
    payment_method: str
    shipping_cost: MoneyInput = Decimal("0")
    notes: str | None = Field(default=None, max_length=2000)

    clean_optional_texts = field_validator("notes")(empty_to_none)
    check_payment_method = field_validator("payment_method")(validate_payment_method)


class PublicOrderItemIn(InputSchema):
    product_id: int = Field(gt=0)
    quantity: int = Field(gt=0, le=1000)


class PublicOrderIn(InputSchema):
    """Pedido hecho por el cliente: solo productos del catálogo, a su precio y sin costo de envío."""

    customer: CustomerIn
    items: list[PublicOrderItemIn] = Field(min_length=1, max_length=50)
    payment_method: str
    notes: str | None = Field(default=None, max_length=2000)

    clean_optional_texts = field_validator("notes")(empty_to_none)
    check_payment_method = field_validator("payment_method")(validate_payment_method)


class OrderStatusIn(InputSchema):
    status: str

    check_status = field_validator("status")(validate_status)


class OrderItemOut(OutputSchema):
    id: int
    product_id: int | None
    product_name: str
    quantity: int
    unit_price: Money
    subtotal: Money


class OrderOut(OutputSchema):
    id: int
    order_number: str
    tracking_code: str
    created_at: datetime
    updated_at: datetime
    customer: CustomerOut
    payment_method: str
    status: str
    shipping_address: str
    shipping_city: str | None
    subtotal: Money
    shipping_cost: Money
    total: Money
    notes: str | None
    items: list[OrderItemOut]


class PublicOrderItem(OutputSchema):
    product_name: str
    quantity: int
    subtotal: Money


class PublicOrderOut(OutputSchema):
    """Vista para el cliente: sin teléfono, dirección ni datos internos."""

    order_number: str
    created_at: datetime
    updated_at: datetime
    status: str
    status_label: str
    steps: list[Option]
    items: list[PublicOrderItem]
    shipping_cost: Money
    total: Money


class PublicOrderCreated(PublicOrderOut):
    tracking_code: str


class OrderSummary(OutputSchema):
    id: int
    order_number: str
    created_at: datetime
    customer_name: str
    customer_phone: str
    payment_method: str
    status: str
    total: Money


class OrderPage(BaseModel):
    items: list[OrderSummary]
    total: int
    page: int
    page_size: int
    # Suma de los pedidos filtrados, excluyendo los cancelados.
    sales_total: Money
