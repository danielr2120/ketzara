from datetime import datetime

from pydantic import Field, field_validator

from app.schemas.common import InputSchema, Money, MoneyInput, OutputSchema, empty_to_none


class ProductIn(InputSchema):
    name: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=2000)
    price: MoneyInput
    stock: int | None = Field(default=None, ge=0)
    active: bool = True

    clean_optional_texts = field_validator("description")(empty_to_none)


class PublicProductOut(OutputSchema):
    id: int
    name: str
    description: str | None
    price: Money


class ProductOut(OutputSchema):
    id: int
    name: str
    description: str | None
    price: Money
    stock: int | None
    active: bool
    created_at: datetime
    updated_at: datetime
