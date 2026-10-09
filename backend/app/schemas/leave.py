from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import LeaveStatus, MealType, NotificationType
from app.schemas.attendance import MemberBrief


class LeaveCreate(BaseModel):
    date: date
    meal_types: list[MealType] = Field(min_length=1, max_length=2)
    reason: str | None = Field(default=None, max_length=200)


class LeaveOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    date: date
    meal_type: MealType
    reason: str | None
    status: LeaveStatus
    decided_at: datetime | None


class LeaveWithMember(LeaveOut):
    member: MemberBrief


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    type: NotificationType
    title: str
    body: str | None
    read_at: datetime | None
    created_at: datetime
    ref_type: str | None
    ref_id: int | None
    url: str | None = None


class NotificationPage(BaseModel):
    items: list[NotificationOut]
    unread: int
