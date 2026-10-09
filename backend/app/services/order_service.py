import re
import secrets
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.core.constants import (
    CANCELLED_STATUS,
    DEFAULT_ORDER_STATUS,
    ORDER_STATUSES,
    format_order_number,
)
from app.core.errors import BusinessRuleError, NotFoundError
from app.models import Customer, Order, OrderItem, Product, order_number_seq
from app.schemas.order import OrderIn, OrderItemIn, PublicOrderIn
from app.services import customer_service
from app.services.utils import end_of_day_exclusive, like_pattern, start_of_day

CENT = Decimal("0.01")
ORDER_NUMBER_SEARCH = re.compile(r"^(?:PED-?)?0*(\d{1,9})$", re.IGNORECASE)


@dataclass
class OrderFilters:
    search: str | None = None
    status: str | None = None
    date_from: date | None = None
    date_to: date | None = None


def _money(value: Decimal) -> Decimal:
    return value.quantize(CENT)


def _build_items(
    db: Session, items_in: list[OrderItemIn], allowed_inactive_ids: set[int]
) -> list[OrderItem]:
    product_ids = {i.product_id for i in items_in if i.product_id is not None}
    products = {
        p.id: p for p in db.scalars(select(Product).where(Product.id.in_(product_ids)))
    } if product_ids else {}

    items: list[OrderItem] = []
    for position, item in enumerate(items_in, start=1):
        product = products.get(item.product_id) if item.product_id is not None else None
        if item.product_id is not None:
            if product is None:
                raise BusinessRuleError(f"El producto de la línea {position} no existe")
            if not product.active and product.id not in allowed_inactive_ids:
                raise BusinessRuleError(f"El producto «{product.name}» está desactivado")

        name = item.product_name or product.name  # type: ignore[union-attr]
        unit_price = _money(item.unit_price if item.unit_price is not None else product.price)  # type: ignore[union-attr]
        items.append(
            OrderItem(
                product_id=item.product_id,
                product_name=name,
                quantity=item.quantity,
                unit_price=unit_price,
                subtotal=_money(unit_price * item.quantity),
            )
        )
    return items


def _apply_order_data(db: Session, order: Order, data: OrderIn, items: list[OrderItem]) -> None:
    customer = customer_service.upsert_by_phone(db, data.customer)
    order.customer = customer
    order.shipping_address = data.customer.address
    order.shipping_city = data.customer.city
    order.payment_method = data.payment_method
    order.notes = data.notes
    order.items = items
    order.subtotal = _money(sum((i.subtotal for i in items), Decimal("0")))
    order.shipping_cost = _money(data.shipping_cost)
    order.total = order.subtotal + order.shipping_cost


def create_order(db: Session, data: OrderIn) -> Order:
    """Crea cliente (o lo actualiza), ítems y pedido en una sola transacción."""
    items = _build_items(db, data.items, allowed_inactive_ids=set())
    sequence_value = db.execute(select(order_number_seq.next_value())).scalar_one()
    order = Order(
        order_number=format_order_number(sequence_value),
        tracking_code=secrets.token_urlsafe(9),
        status=DEFAULT_ORDER_STATUS,
    )
    _apply_order_data(db, order, data, items)
    db.add(order)
    db.commit()
    return get_order(db, order.id)


def create_public_order(db: Session, data: PublicOrderIn) -> Order:
    """Pedido hecho por el cliente: usa siempre el precio del catálogo y no admite productos agotados."""
    product_ids = {i.product_id for i in data.items}
    sold_out = db.scalar(
        select(Product.name).where(Product.id.in_(product_ids), Product.stock == 0).limit(1)
    )
    if sold_out:
        raise BusinessRuleError(f"El producto «{sold_out}» está agotado")
    order_data = OrderIn(
        customer=data.customer,
        items=[OrderItemIn(product_id=i.product_id, quantity=i.quantity) for i in data.items],
        payment_method=data.payment_method,
        notes=data.notes,
    )
    return create_order(db, order_data)


def get_order(db: Session, order_id: int) -> Order:
    order = db.execute(
        select(Order).where(Order.id == order_id).execution_options(populate_existing=True)
    ).unique().scalar_one_or_none()
    if order is None:
        raise NotFoundError("Pedido no encontrado")
    return order


def get_order_by_number(db: Session, number: str) -> Order:
    """Acepta 'PED-000157', 'ped-157' o '157'."""
    match = ORDER_NUMBER_SEARCH.match(number.strip())
    order_id = None
    if match:
        order_id = db.scalar(
            select(Order.id).where(Order.order_number == format_order_number(int(match.group(1))))
        )
    if order_id is None:
        raise NotFoundError("No encontramos un pedido con ese número")
    return get_order(db, order_id)


def get_order_by_tracking_code(db: Session, code: str) -> Order:
    order_id = db.scalar(select(Order.id).where(Order.tracking_code == code))
    if order_id is None:
        raise NotFoundError("El enlace no es válido o el pedido no existe")
    return get_order(db, order_id)


def update_order(db: Session, order_id: int, data: OrderIn) -> Order:
    order = get_order(db, order_id)
    if order.status == CANCELLED_STATUS:
        raise BusinessRuleError("No se puede editar un pedido cancelado")
    existing_product_ids = {i.product_id for i in order.items if i.product_id is not None}
    items = _build_items(db, data.items, allowed_inactive_ids=existing_product_ids)
    _apply_order_data(db, order, data, items)
    db.commit()
    return get_order(db, order.id)


def change_status(db: Session, order_id: int, status: str) -> Order:
    order = get_order(db, order_id)
    order.status = status
    db.commit()
    return get_order(db, order.id)


def _apply_filters(stmt: Select, filters: OrderFilters, tz: ZoneInfo) -> Select:
    if filters.search and filters.search.strip():
        term = filters.search.strip()
        conditions = [
            Order.order_number.ilike(like_pattern(term), escape="\\"),
            Customer.name.ilike(like_pattern(term), escape="\\"),
        ]
        number_match = ORDER_NUMBER_SEARCH.match(term)
        if number_match:
            conditions.append(Order.order_number == format_order_number(int(number_match.group(1))))
        digits = re.sub(r"\D", "", term)
        if len(digits) >= 3:
            conditions.append(Customer.phone.like(f"%{digits}%"))
        stmt = stmt.where(or_(*conditions))
    if filters.status:
        if filters.status not in ORDER_STATUSES:
            raise BusinessRuleError("Estado de pedido no válido")
        stmt = stmt.where(Order.status == filters.status)
    if filters.date_from:
        stmt = stmt.where(Order.created_at >= start_of_day(filters.date_from, tz))
    if filters.date_to:
        stmt = stmt.where(Order.created_at < end_of_day_exclusive(filters.date_to, tz))
    return stmt


def list_orders_for_export(db: Session, filters: OrderFilters, tz: ZoneInfo) -> list[Order]:
    stmt = _apply_filters(select(Order).join(Customer, Order.customer_id == Customer.id), filters, tz)
    return list(db.scalars(stmt.order_by(Order.id.desc())).unique())


def list_orders(
    db: Session, filters: OrderFilters, tz: ZoneInfo, page: int = 1, page_size: int = 20
) -> dict:
    base = select(Order).join(Customer, Order.customer_id == Customer.id)
    filtered = _apply_filters(base, filters, tz)
    ids_subquery = filtered.with_only_columns(Order.id).subquery()

    total = db.scalar(select(func.count()).select_from(ids_subquery)) or 0
    sales_total = db.scalar(
        select(func.coalesce(func.sum(Order.total), 0))
        .where(Order.id.in_(select(ids_subquery.c.id)))
        .where(Order.status != CANCELLED_STATUS)
    )

    rows_stmt = _apply_filters(
        select(
            Order.id,
            Order.order_number,
            Order.created_at,
            Customer.name.label("customer_name"),
            Customer.phone.label("customer_phone"),
            Order.payment_method,
            Order.status,
            Order.total,
        ).join(Customer, Order.customer_id == Customer.id),
        filters,
        tz,
    )
    rows = db.execute(
        rows_stmt.order_by(Order.id.desc()).limit(page_size).offset((page - 1) * page_size)
    ).mappings().all()

    return {
        "items": rows,
        "total": total,
        "page": page,
        "page_size": page_size,
        "sales_total": sales_total,
    }
