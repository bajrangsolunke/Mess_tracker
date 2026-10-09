from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.phone import normalize_phone
from app.models.enums import LedgerKind
from app.schemas.common import Money, MoneyIn


class StaffCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str
    monthly_salary: MoneyIn = Field(gt=0)

    @field_validator("phone")
    @classmethod
    def _phone(cls, value: str) -> str:
        return normalize_phone(value)


class StaffUpdate(BaseModel):
    monthly_salary: MoneyIn | None = Field(default=None, gt=0)
    is_active: bool | None = None


class StaffOut(BaseModel):
    id: int
    user_id: int
    name: str
    phone: str
    monthly_salary: Money
    is_active: bool
    created_at: datetime


class StaffCreated(BaseModel):
    staff: StaffOut
    temp_password: str


class LedgerCreate(BaseModel):
    kind: LedgerKind
    amount: MoneyIn = Field(gt=0)
    occurred_on: date
    description: str = Field(min_length=1, max_length=160)
    note: str | None = Field(default=None, max_length=2000)
    staff_user_id: int | None = None


class LedgerEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: LedgerKind
    amount: Money
    occurred_on: date
    description: str
    note: str | None
    staff_user_id: int | None
    staff_name: str | None
    recorded_by: int | None
    created_at: datetime


class LedgerTotals(BaseModel):
    income: Money
    expense: Money
    staff_advance: Money
    salary_payment: Money
    advance_repayment: Money
    cash_in: Money
    cash_out: Money
    net: Money


class LedgerReport(BaseModel):
    from_date: date
    to_date: date
    entries: list[LedgerEntryOut]
    totals: LedgerTotals
