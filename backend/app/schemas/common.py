from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, Field, PlainSerializer

Money = Annotated[Decimal, PlainSerializer(lambda v: f"{v:.2f}", return_type=str)]
MoneyIn = Annotated[Decimal, Field(ge=0, max_digits=10, decimal_places=2)]


class Page[T](BaseModel):
    items: list[T]
    total: int
