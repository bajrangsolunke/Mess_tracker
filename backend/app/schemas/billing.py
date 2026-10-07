from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import BillStatus, PaymentMethod
from app.schemas.attendance import MemberBrief
from app.schemas.common import Money, MoneyIn
from app.schemas.plan import PlanOut


class PaymentCreate(BaseModel):
    amount: MoneyIn = Field(gt=0)
    method: PaymentMethod
    paid_on: date
    note: str | None = Field(default=None, max_length=200)


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    amount: Money
    method: PaymentMethod
    paid_on: date
    note: str | None


class BillUpdate(BaseModel):
    amount: MoneyIn | None = None
    note: str | None = Field(default=None, max_length=200)


class BillOut(BaseModel):
    id: int
    member: MemberBrief
    month: date
    period_start: date | None = None
    period_end: date | None = None
    amount: Money
    paid: Money
    due: Money
    status: BillStatus
    note: str | None
    payments: list[PaymentOut]


class BillTotals(BaseModel):
    billed: Money
    collected: Money
    pending: Money
    members: int
    paid: int


class BillPage(BaseModel):
    month: date
    totals: BillTotals
    items: list[BillOut]


class GenerateResult(BaseModel):
    month: date
    created: int
    total: int


class RemindersResult(BaseModel):
    sent: int


class MembershipInfo(BaseModel):
    valid_until: date | None
    days_left: int | None
    expired: bool
    renewal_plan: "PlanOut | None" = None
    renewal_requested_at: "datetime | None" = None


class DueRow(BaseModel):
    member: MemberBrief
    valid_until: date
    days_left: int
    renewal_plan: "PlanOut | None" = None
    renewal_requested_at: "datetime | None" = None
