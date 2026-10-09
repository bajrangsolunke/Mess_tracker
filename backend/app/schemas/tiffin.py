from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.phone import normalize_phone
from app.models.enums import FoodType, MealType, PaymentMethod
from app.schemas.common import Money, MoneyIn


def _opt_phone(v: str | None) -> str | None:
    if v is None or not v.strip():
        return None
    return normalize_phone(v)


# --- price list ---------------------------------------------------------------------


class TiffinItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    price: MoneyIn = Field(gt=0)
    food_type: FoodType = FoodType.veg
    sort_order: int = 0


class TiffinItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    price: MoneyIn | None = Field(default=None, gt=0)
    food_type: FoodType | None = None
    is_active: bool | None = None
    sort_order: int | None = None


class TiffinItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    price: Money
    food_type: FoodType
    is_active: bool
    sort_order: int


# --- clients ------------------------------------------------------------------------


class TiffinClientCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    contact_name: str | None = Field(default=None, max_length=120)
    phone: str | None = None
    address: str | None = Field(default=None, max_length=300)
    notes: str | None = Field(default=None, max_length=2000)
    veg_price: MoneyIn | None = Field(default=None, ge=0)
    nonveg_price: MoneyIn | None = Field(default=None, ge=0)
    lunch: bool = True
    dinner: bool = False

    _phone = field_validator("phone")(_opt_phone)


class TiffinClientUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    contact_name: str | None = Field(default=None, max_length=120)
    phone: str | None = None
    address: str | None = Field(default=None, max_length=300)
    notes: str | None = Field(default=None, max_length=2000)
    is_active: bool | None = None
    veg_price: MoneyIn | None = Field(default=None, ge=0)
    nonveg_price: MoneyIn | None = Field(default=None, ge=0)
    lunch: bool | None = None
    dinner: bool | None = None

    _phone = field_validator("phone")(_opt_phone)


class TiffinClientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    contact_name: str | None
    phone: str | None
    address: str | None
    is_active: bool
    notes: str | None
    veg_price: Money | None = None
    nonveg_price: Money | None = None
    lunch: bool = True
    dinner: bool = True


# --- simple daily entry (veg / non-veg counts per company and meal) -----------------


class DayEntry(BaseModel):
    client_id: int
    meal_type: MealType
    veg: int = Field(ge=0, le=5000)
    nonveg: int = Field(ge=0, le=5000)


class DayPut(BaseModel):
    date: date
    entries: list[DayEntry] = Field(max_length=500)


class DayRow(BaseModel):
    client_id: int
    client_name: str
    meal_type: MealType
    veg: int
    nonveg: int
    saved: bool
    last_date: date | None
    last_veg: int
    last_nonveg: int
    veg_price: Money | None  # hidden from staff
    nonveg_price: Money | None
    amount: Money | None


class DayTotals(BaseModel):
    veg: int
    nonveg: int
    total: int
    lunch: int
    dinner: int
    amount: Money | None


class TiffinDay(BaseModel):
    date: date
    locked: bool
    rows: list[DayRow]
    totals: DayTotals


# --- daily orders -------------------------------------------------------------------


class LineIn(BaseModel):
    item_id: int
    quantity: int = Field(ge=0, le=5000)


class OrderIn(BaseModel):
    client_id: int
    lines: list[LineIn] = Field(max_length=50)
    note: str | None = Field(default=None, max_length=200)


class OrdersPut(BaseModel):
    date: date
    meal_type: MealType
    items: list[OrderIn] = Field(max_length=500)


class OrderRow(BaseModel):
    client: TiffinClientOut
    quantities: dict[str, int]  # item_id -> quantity (only > 0)
    note: str | None
    total: int
    amount: Money


class OrderTotals(BaseModel):
    total: int
    veg: int
    nonveg: int  # egg + non-veg
    amount: Money


class OrderSheet(BaseModel):
    date: date
    meal_type: MealType
    locked: bool
    items: list[TiffinItemOut]  # active items + any item used that day
    totals: OrderTotals
    by_item: dict[str, int]
    rows: list[OrderRow]


class CopyResult(BaseModel):
    copied: int


# --- statements ---------------------------------------------------------------------


class StatementDay(BaseModel):
    date: date
    lunch: int
    dinner: int
    total: int
    amount: Money
    lunch_veg: int = 0
    lunch_nonveg: int = 0
    dinner_veg: int = 0
    dinner_nonveg: int = 0


class ItemTotal(BaseModel):
    item_id: int
    name: str
    food_type: FoodType
    quantity: int
    amount: Money


class CountTotals(BaseModel):
    total: int
    veg: int
    nonveg: int


class TiffinPaymentCreate(BaseModel):
    month: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}$")  # legacy; paid_on decides
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
    by_item: list[ItemTotal]
    totals: CountTotals
    amount: Money
    paid: Money
    due: Money  # this month only; negative = advance
    payments: list[TiffinPaymentOut]
    opening_due: Money = Decimal("0")  # carried from earlier months
    balance: Money = Decimal("0")  # opening + this month's tiffins - this month's payments


class SummaryRow(BaseModel):
    client: TiffinClientOut
    total: int
    veg: int
    nonveg: int
    amount: Money
    paid: Money
    due: Money
    balance: Money = Decimal("0")  # everything delivered minus everything paid, to date


class SummaryTotals(BaseModel):
    total: int
    veg: int
    nonveg: int
    amount: Money
    paid: Money
    due: Money
    balance: Money = Decimal("0")


class TiffinSummary(BaseModel):
    month: date
    totals: SummaryTotals
    items: list[SummaryRow]


class BulkItem(BaseModel):
    name: str
    food_type: FoodType
    quantity: int


class BulkToday(BaseModel):
    veg: int
    nonveg: int
    total: int
    lunch: int
    dinner: int
    items: list[BulkItem] = []
