from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.phone import normalize_phone
from app.models.enums import MemberStatus, MemberType, PaymentMethod
from app.schemas.common import Money, MoneyIn
from app.schemas.credits import CreditOut
from app.schemas.plan import PlanOut


class MemberCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str
    plan_id: int
    joining_date: date
    monthly_fee: MoneyIn | None = None  # defaults to plan fee
    room_no: str | None = Field(default=None, max_length=30)
    member_type: MemberType = MemberType.dine_in
    company: str | None = Field(default=None, max_length=120)
    delivery_address: str | None = Field(default=None, max_length=300)
    deposit: MoneyIn = Decimal("0")
    emergency_contact: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=2000)
    create_login: bool = True
    # money received at registration: full fee, part of it, or nothing (0)
    paid_amount: MoneyIn = Decimal("0")
    payment_method: PaymentMethod = PaymentMethod.cash

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        return normalize_phone(v)


class MemberUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    plan_id: int | None = None
    monthly_fee: MoneyIn | None = None
    room_no: str | None = Field(default=None, max_length=30)
    member_type: MemberType | None = None
    company: str | None = Field(default=None, max_length=120)
    delivery_address: str | None = Field(default=None, max_length=300)
    joining_date: date | None = None
    deposit: MoneyIn | None = None
    emergency_contact: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=2000)


class MemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    member_no: int
    user_id: int | None
    name: str
    phone: str
    room_no: str | None
    member_type: MemberType
    company: str | None
    delivery_address: str | None
    plan: PlanOut
    monthly_fee: Money
    joining_date: date
    status: MemberStatus
    deposit: Money
    emergency_contact: str | None
    notes: str | None
    inactive_from: date | None
    valid_until: date | None = None
    renewal_plan: PlanOut | None = None
    renewal_requested_at: datetime | None = None
    next_plan: PlanOut | None = None
    next_plan_from: date | None = None
    share_token: str | None = None
    due: Money = Decimal("0")  # unpaid amount across all bills
    credits: CreditOut | None = None  # tiffin pack in use today


class MemberCreated(BaseModel):
    member: MemberOut
    temp_password: str | None


class TempPassword(BaseModel):
    temp_password: str


class RenewIn(BaseModel):
    plan_id: int | None = None
    start_date: date | None = None
    paid_amount: MoneyIn = Decimal("0")
    payment_method: PaymentMethod = PaymentMethod.cash


class RenewalRequest(BaseModel):
    plan_id: int
