from datetime import date

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.phone import normalize_phone
from app.models.enums import MealType, PaymentMethod
from app.schemas.common import Money, MoneyIn


def _opt_phone(v: str | None) -> str | None:
    if v is None or not v.strip():
        return None
    return normalize_phone(v)


class TiffinClientCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    contact_name: str | None = Field(default=None, max_length=120)
    phone: str | None = None
    address: str | None = Field(default=None, max_length=300)
    veg_rate: MoneyIn
    nonveg_rate: MoneyIn
    notes: str | None = Field(default=None, max_length=2000)

    _phone = field_validator("phone")(_opt_phone)


class TiffinClientUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    contact_name: str | None = Field(default=None, max_length=120)
    phone: str | None = None
    address: str | None = Field(default=None, max_length=300)
    veg_rate: MoneyIn | None = None
    nonveg_rate: MoneyIn | None = None
    notes: str | None = Field(default=None, max_length=2000)
    is_active: bool | None = None

    _phone = field_validator("phone")(_opt_phone)


class TiffinClientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    contact_name: str | None
    phone: str | None
    address: str | None
    veg_rate: Money
    nonveg_rate: Money
    is_active: bool
    notes: str | None


class OrderItem(BaseModel):
    client_id: int
    veg_count: int = Field(ge=0, le=5000)
    nonveg_count: int = Field(ge=0, le=5000)
    note: str | None = Field(default=None, max_length=200)


class OrdersPut(BaseModel):
    date: date
    meal_type: MealType
    items: list[OrderItem] = Field(max_length=500)


class OrderRow(BaseModel):
    client: TiffinClientOut
    veg_count: int
    nonveg_count: int
    note: str | None


class OrderTotals(BaseModel):
    veg: int
    nonveg: int
    total: int
    amount: Money


class OrderSheet(BaseModel):
    date: date
    meal_type: MealType
    locked: bool
    totals: OrderTotals
    items: list[OrderRow]


class CopyResult(BaseModel):
    copied: int


class StatementDay(BaseModel):
    date: date
    lunch_veg: int
    lunch_nonveg: int
    dinner_veg: int
    dinner_nonveg: int
    amount: Money


class CountTotals(BaseModel):
    veg: int
    nonveg: int
    total: int


class TiffinPaymentCreate(BaseModel):
    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    amount: MoneyIn = Field(gt=0)
    method: PaymentMethod
    paid_on: date
    note: str | None = Field(default=None, max_length=200)


class TiffinPaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    amount: Money
    method: PaymentMethod
    paid_on: date
    note: str | None


class Statement(BaseModel):
    client: TiffinClientOut
    month: date
    days: list[StatementDay]
    totals: CountTotals
    amount: Money
    paid: Money
    due: Money  # negative = advance
    payments: list[TiffinPaymentOut]


class SummaryRow(BaseModel):
    client: TiffinClientOut
    veg: int
    nonveg: int
    total: int
    amount: Money
    paid: Money
    due: Money


class SummaryTotals(BaseModel):
    veg: int
    nonveg: int
    total: int
    amount: Money
    paid: Money
    due: Money


class TiffinSummary(BaseModel):
    month: date
    totals: SummaryTotals
    items: list[SummaryRow]


class BulkToday(BaseModel):
    veg: int
    nonveg: int
    total: int
    lunch: int
    dinner: int
