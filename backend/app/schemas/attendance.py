from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AttendanceStatus, HolidayMeal, MealType, MemberType
from app.schemas.credits import CreditOut
from app.schemas.member import PlanOut


class MemberBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    member_no: int
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
    self_marked: bool = False
    auto: bool = False
    marked_at: datetime | None = None
    marked_by_name: str | None = None  # owner or staff who marked it
    tiffins_left: int | None = None  # None = unlimited plan
    extra: bool = False  # not expected at this meal but marked (e.g. 1-time member's other meal)


class RegisterRow(BaseModel):
    member: MemberBrief
    joining_date: date
    inactive_from: date | None
    valid_until: date | None = None
    marks: dict[str, dict[str, AttendanceStatus]]
    present: int


class RegisterHoliday(BaseModel):
    date: date
    meal_type: HolidayMeal


class Register(BaseModel):
    month: date
    days: int
    locked: bool
    holidays: list[RegisterHoliday]
    rows: list[RegisterRow]


class MealToday(BaseModel):
    expected: bool
    status: AttendanceStatus | None
    self_marked: bool
    on_leave: bool
    holiday: bool
    closed: bool = False
    ends_at: datetime | None = None
    auto: bool = False
    marked_at: datetime | None = None


class MyToday(BaseModel):
    date: date
    lunch: MealToday
    dinner: MealToday
    valid_until: date | None = None
    expired: bool = False


class CheckIn(BaseModel):
    meal_type: MealType


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
    closed: bool = False  # meal time is over; missed marks are absent
    ends_at: datetime | None = None
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
    override: bool = False  # owner correcting an existing mark


class HolidayCreate(BaseModel):
    date: date
    meal_type: HolidayMeal = HolidayMeal.all
    reason: str | None = Field(default=None, max_length=200)


class HistoryItem(BaseModel):
    date: date
    meal_type: MealType
    status: AttendanceStatus
    marked_at: datetime | None = None
    auto: bool = False
    self_marked: bool = False


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


class KitchenMeal(BaseModel):
    """What the kitchen needs for one meal: members expected and company tiffins."""

    holiday: bool
    closed: bool
    counts: AttendanceCounts
    tiffin_veg: int
    tiffin_nonveg: int


class KitchenToday(BaseModel):
    date: date
    lunch: KitchenMeal
    dinner: KitchenMeal


class SearchMeal(BaseModel):
    status: AttendanceStatus | None
    marked_at: datetime | None = None
    marked_by_name: str | None = None
    auto: bool = False
    allowed: bool  # can be marked present now
    reason: str | None = None  # why not: NO_TIFFINS_LEFT, MEMBERSHIP_EXPIRED, HOLIDAY, ...


class SearchRow(BaseModel):
    """A member found by name, phone or ID, with today's meals, for quick marking."""

    member: MemberBrief
    active: bool
    valid_until: date | None
    credits: CreditOut | None
    lunch: SearchMeal
    dinner: SearchMeal
