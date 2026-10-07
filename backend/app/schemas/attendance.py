from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AttendanceStatus, HolidayMeal, MealType, MemberType
from app.schemas.member import PlanOut


class MemberBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    phone: str
    room_no: str | None
    member_type: MemberType = MemberType.dine_in
    company: str | None = None
    plan: PlanOut


class AttendanceRow(BaseModel):
    member: MemberBrief
    status: AttendanceStatus | None  # None = unmarked
    on_leave: bool = False
    leave_status: str | None = None


class AttendanceCounts(BaseModel):
    expected: int
    present: int
    absent: int
    unmarked: int
    on_leave: int


class HolidayOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    date: date
    meal_type: HolidayMeal
    reason: str | None


class AttendanceSheet(BaseModel):
    date: date
    meal_type: MealType
    locked: bool
    holiday: HolidayOut | None
    counts: AttendanceCounts
    items: list[AttendanceRow]


class MarkItem(BaseModel):
    member_id: int
    status: AttendanceStatus


class BulkMark(BaseModel):
    date: date
    meal_type: MealType
    items: list[MarkItem] = Field(max_length=1000)


class HolidayCreate(BaseModel):
    date: date
    meal_type: HolidayMeal = HolidayMeal.all
    reason: str | None = Field(default=None, max_length=200)


class HistoryItem(BaseModel):
    date: date
    meal_type: MealType
    status: AttendanceStatus


class HistoryOut(BaseModel):
    member: MemberBrief
    month: date
    present_count: int
    absent_count: int
    items: list[HistoryItem]
    leaves: list[HistoryItem] = []


class SummaryRow(BaseModel):
    member: MemberBrief
    lunch_present: int
    dinner_present: int
    total_present: int


class MonthState(BaseModel):
    month: date
    closed: bool
