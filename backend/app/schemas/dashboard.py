from datetime import date

from pydantic import BaseModel

from app.schemas.attendance import AttendanceCounts, MemberBrief, SummaryRow
from app.schemas.billing import BillOut, BillTotals
from app.schemas.common import Money
from app.schemas.leave import LeaveOut
from app.schemas.menu import AnnouncementOut


class MenuToday(BaseModel):
    lunch: list[str]
    dinner: list[str]


class OwnerDashboard(BaseModel):
    date: date
    active_members: int
    tiffin_members: int
    lunch: AttendanceCounts
    dinner: AttendanceCounts
    payments: BillTotals
    menu: MenuToday
    late_leaves: int
    meals_served_month: int
    holiday_today: str | None = None


class CustomerDashboard(BaseModel):
    date: date
    member: MemberBrief
    meals_this_month: int
    bill: BillOut | None
    menu: MenuToday
    upcoming_leaves: list[LeaveOut]
    unread_notifications: int
    announcements: list[AnnouncementOut]


class DayMeals(BaseModel):
    date: date
    lunch: int
    dinner: int


class MealsTotals(BaseModel):
    lunch: int
    dinner: int
    total: int
    tiffin: int


class MealsReport(BaseModel):
    month: date
    days: list[DayMeals]
    totals: MealsTotals


class MonthMoney(BaseModel):
    month: date
    billed: Money
    collected: Money


class PaymentsReport(BaseModel):
    month: date
    totals: BillTotals
    by_method: dict[str, Money]
    months: list[MonthMoney]


AttendanceReport = list[SummaryRow]
