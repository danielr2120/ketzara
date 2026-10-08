from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer

# Los montos se manejan como Decimal internamente y se envían como número en JSON.
Money = Annotated[Decimal, PlainSerializer(float, return_type=float, when_used="json")]

MoneyInput = Annotated[Decimal, Field(ge=0, max_digits=12, decimal_places=2)]


class InputSchema(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class OutputSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


def empty_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    return value or None


class Option(BaseModel):
    value: str
    label: str
