from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.phone import normalize_phone
from app.models.enums import MemberStatus
from app.schemas.common import Money, MoneyIn
from app.schemas.plan import PlanOut


class MemberCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str
    plan_id: int
    joining_date: date
    monthly_fee: MoneyIn | None = None  # defaults to plan fee
    room_no: str | None = Field(default=None, max_length=30)
    deposit: MoneyIn = Decimal("0")
    emergency_contact: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=2000)
    create_login: bool = True

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        return normalize_phone(v)


class MemberUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    plan_id: int | None = None
    monthly_fee: MoneyIn | None = None
    room_no: str | None = Field(default=None, max_length=30)
    joining_date: date | None = None
    deposit: MoneyIn | None = None
    emergency_contact: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=2000)


class MemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int | None
    name: str
    phone: str
    room_no: str | None
    plan: PlanOut
    monthly_fee: Money
    joining_date: date
    status: MemberStatus
    deposit: Money
    emergency_contact: str | None
    notes: str | None
    inactive_from: date | None


class MemberCreated(BaseModel):
    member: MemberOut
    temp_password: str | None


class TempPassword(BaseModel):
    temp_password: str
