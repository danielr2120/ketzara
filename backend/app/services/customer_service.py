import re

from sqlalchemy import func, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.models import Customer
from app.schemas.customer import CustomerIn
from app.services.utils import like_pattern

PHONE_IN_USE = "Ya existe un cliente registrado con ese número de celular"


def list_customers(db: Session, search: str | None = None, limit: int = 50) -> list[Customer]:
    stmt = select(Customer).order_by(Customer.name).limit(limit)
    if search and search.strip():
        conditions = [Customer.name.ilike(like_pattern(search.strip()), escape="\\")]
        digits = re.sub(r"\D", "", search)
        if digits:
            conditions.append(Customer.phone.like(f"%{digits}%"))
        stmt = stmt.where(or_(*conditions))
    return list(db.scalars(stmt))


def get_customer(db: Session, customer_id: int) -> Customer:
    customer = db.get(Customer, customer_id)
    if customer is None:
        raise NotFoundError("Cliente no encontrado")
    return customer


def _phone_taken(db: Session, phone: str, exclude_id: int | None = None) -> bool:
    stmt = select(Customer.id).where(Customer.phone == phone)
    if exclude_id is not None:
        stmt = stmt.where(Customer.id != exclude_id)
    return db.scalar(stmt) is not None


def create_customer(db: Session, data: CustomerIn) -> Customer:
    if _phone_taken(db, data.phone):
        raise ConflictError(PHONE_IN_USE)
    customer = Customer(**data.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def update_customer(db: Session, customer_id: int, data: CustomerIn) -> Customer:
    customer = get_customer(db, customer_id)
    if _phone_taken(db, data.phone, exclude_id=customer_id):
        raise ConflictError(PHONE_IN_USE)
    for field, value in data.model_dump().items():
        setattr(customer, field, value)
    db.commit()
    db.refresh(customer)
    return customer


def upsert_by_phone(db: Session, data: CustomerIn) -> Customer:
    """Crea el cliente o actualiza sus datos si el celular ya existe. No hace commit.

    Se usa INSERT ... ON CONFLICT para que sea seguro ante pedidos simultáneos.
    Ciudad y observaciones vacías no borran los datos que ya tenía el cliente.
    """
    stmt = insert(Customer).values(**data.model_dump())
    stmt = stmt.on_conflict_do_update(
        index_elements=[Customer.phone],
        set_={
            "name": stmt.excluded.name,
            "address": stmt.excluded.address,
            "city": func.coalesce(stmt.excluded.city, Customer.city),
            "notes": func.coalesce(stmt.excluded.notes, Customer.notes),
            "updated_at": func.now(),
        },
    ).returning(Customer.id)
    customer_id = db.execute(stmt).scalar_one()
    return db.execute(
        select(Customer).where(Customer.id == customer_id).execution_options(populate_existing=True)
    ).scalar_one()
