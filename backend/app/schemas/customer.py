import re
from datetime import datetime

from pydantic import Field, field_validator

from app.schemas.common import InputSchema, OutputSchema, empty_to_none


def normalize_phone(value: str) -> str:
    """Deja solo dígitos (y un '+' inicial opcional) para comparar teléfonos de forma fiable."""
    has_plus = value.startswith("+")
    digits = re.sub(r"\D", "", value)
    if not 7 <= len(digits) <= 15:
        raise ValueError("Número de celular inválido (debe tener entre 7 y 15 dígitos)")
    return f"+{digits}" if has_plus else digits


class CustomerIn(InputSchema):
    name: str = Field(min_length=1, max_length=150)
    phone: str = Field(min_length=1, max_length=30)
    address: str = Field(min_length=1, max_length=255)
    city: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None, max_length=1000)

    check_phone = field_validator("phone")(normalize_phone)
    clean_optional_texts = field_validator("city", "notes")(empty_to_none)


class CustomerOut(OutputSchema):
    id: int
    name: str
    phone: str
    address: str
    city: str | None
    notes: str | None
    created_at: datetime
