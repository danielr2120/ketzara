from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models import Product
from app.schemas.product import ProductIn
from app.services.utils import like_pattern


def list_products(db: Session, active: bool | None = None, search: str | None = None) -> list[Product]:
    stmt = select(Product).order_by(Product.active.desc(), Product.name)
    if active is not None:
        stmt = stmt.where(Product.active == active)
    if search and search.strip():
        stmt = stmt.where(Product.name.ilike(like_pattern(search.strip()), escape="\\"))
    return list(db.scalars(stmt))


def list_available_products(db: Session) -> list[Product]:
    """Productos que el cliente puede pedir: activos y no agotados (stock vacío = sin control)."""
    stmt = (
        select(Product)
        .where(Product.active.is_(True), or_(Product.stock.is_(None), Product.stock > 0))
        .order_by(Product.name)
    )
    return list(db.scalars(stmt))


def get_product(db: Session, product_id: int) -> Product:
    product = db.get(Product, product_id)
    if product is None:
        raise NotFoundError("Producto no encontrado")
    return product


def create_product(db: Session, data: ProductIn) -> Product:
    product = Product(**data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def update_product(db: Session, product_id: int, data: ProductIn) -> Product:
    product = get_product(db, product_id)
    for field, value in data.model_dump().items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product
