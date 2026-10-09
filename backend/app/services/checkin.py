"""A member's view of today's meals (marking is done by the owner or staff)."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.time import now_ist
from app.models import (
    Attendance,
    Leave,
    LeaveStatus,
    MealType,
    Member,
    Organization,
    User,
)
from app.schemas.attendance import MealToday, MyToday
from app.services.attendance import holiday_for, meal_end


def _includes(member: Member, meal: MealType) -> bool:
    return member.plan.includes_lunch if meal is MealType.lunch else member.plan.includes_dinner


async def today_status(db: AsyncSession, member: Member, user: User) -> MyToday:
    now = now_ist()
    d = now.date()
    org = await db.get(Organization, member.organization_id)
    marks = {
        a.meal_type: a
        for a in (
            await db.execute(
                select(Attendance)
                .where(Attendance.member_id == member.id, Attendance.date == d)
                .execution_options(populate_existing=True)
            )
        ).scalars()
    }
    leaves = {
        lv.meal_type
        for lv in (
            await db.execute(
                select(Leave).where(
                    Leave.member_id == member.id,
                    Leave.date == d,
                    Leave.status == LeaveStatus.approved,
                )
            )
        ).scalars()
    }
    out = {}
    for meal in (MealType.lunch, MealType.dinner):
        a = marks.get(meal)
        ends = meal_end(org, d, meal)
        out[meal.value] = MealToday(
            closed=now >= ends,
            ends_at=ends,
            auto=bool(a and a.auto),
            marked_at=a.marked_at if a else None,
            expected=_includes(member, meal) and member.joining_date <= d,
            status=a.status if a else None,
            self_marked=bool(a and a.marked_by == user.id),
            on_leave=meal in leaves,
            holiday=await holiday_for(db, member.organization_id, d, meal) is not None,
        )
    expired = member.valid_until is not None and member.valid_until < d
    if expired:
        for v in out.values():
            v.expected = False
    return MyToday(date=d, valid_until=member.valid_until, expired=expired, **out)
