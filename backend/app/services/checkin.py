"""Member self check-in: the digital replacement for signing the mess notebook."""

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.core.time import now_ist
from app.models import (
    Attendance,
    AttendanceStatus,
    Leave,
    LeaveStatus,
    MealType,
    Member,
    Organization,
    User,
)
from app.schemas.attendance import MealToday, MyToday
from app.services.attendance import assert_month_open, holiday_for, meal_end


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


async def check_in(db: AsyncSession, member: Member, user: User, meal: MealType) -> None:
    now = now_ist()
    d = now.date()
    if not _includes(member, meal) or member.joining_date > d:
        raise ApiError(422, "MEAL_NOT_IN_PLAN", "This meal is not part of your plan")
    if member.valid_until is not None and member.valid_until < d:
        raise ApiError(409, "MEMBERSHIP_EXPIRED", "Your membership has ended; please renew")
    if await holiday_for(db, member.organization_id, d, meal) is not None:
        raise ApiError(409, "HOLIDAY", "Mess is closed for this meal today")
    await assert_month_open(db, member.organization_id, d)
    org = await db.get(Organization, member.organization_id)
    if now >= meal_end(org, d, meal):
        raise ApiError(409, "MEAL_CLOSED", "Meal time is over; ask the owner to change it")
    existing = (
        await db.execute(
            select(Attendance).where(
                Attendance.member_id == member.id,
                Attendance.date == d,
                Attendance.meal_type == meal,
            )
        )
    ).scalar_one_or_none()
    if existing is not None and existing.marked_by != user.id:
        raise ApiError(409, "OWNER_MARKED", "The owner has already marked this meal")
    stmt = insert(Attendance).values(
        organization_id=member.organization_id,
        member_id=member.id,
        date=d,
        meal_type=meal,
        status=AttendanceStatus.present,
        marked_by=user.id,
        marked_at=now,
        auto=False,
    )
    stmt = stmt.on_conflict_do_update(
        constraint="uq_attendance_member_date_meal",
        set_={
            "status": AttendanceStatus.present,
            "marked_by": user.id,
            "marked_at": now,
            "auto": False,
        },
    )
    await db.execute(stmt)
    await db.flush()


async def undo_check_in(db: AsyncSession, member: Member, user: User, meal: MealType) -> None:
    d = now_ist().date()
    await assert_month_open(db, member.organization_id, d)
    existing = (
        await db.execute(
            select(Attendance).where(
                Attendance.member_id == member.id,
                Attendance.date == d,
                Attendance.meal_type == meal,
            )
        )
    ).scalar_one_or_none()
    if existing is None:
        return
    if existing.marked_by != user.id:
        raise ApiError(409, "OWNER_MARKED", "The owner has marked this meal; ask them to change it")
    await db.delete(existing)
    await db.flush()
