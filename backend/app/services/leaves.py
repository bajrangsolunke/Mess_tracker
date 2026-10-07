from datetime import UTC, date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.core.time import now_ist
from app.models import Leave, LeaveStatus, MealType, Member, NotificationType, Organization
from app.services.attendance import assert_month_open
from app.services.notifications import notify


def decide_status(leave_date: date, now: datetime, cutoff: time) -> str:
    """Approved when submitted before `cutoff` on the day before (or earlier); otherwise late."""
    today = now.date()
    if leave_date > today + timedelta(days=1):
        return LeaveStatus.approved.value
    if leave_date == today + timedelta(days=1) and now.time() < cutoff:
        return LeaveStatus.approved.value
    return LeaveStatus.late.value


async def create_leaves(
    db: AsyncSession,
    org: Organization,
    member: Member,
    d: date,
    meals: list[MealType],
    reason: str | None,
) -> list[Leave]:
    now = now_ist()
    if d < now.date():
        raise ApiError(422, "LEAVE_IN_PAST", "Leave date cannot be in the past")
    await assert_month_open(db, org.id, d)
    status = LeaveStatus(decide_status(d, now, org.leave_cutoff_time))
    existing = {
        lv.meal_type: lv
        for lv in (
            await db.execute(select(Leave).where(Leave.member_id == member.id, Leave.date == d))
        ).scalars()
    }
    out: list[Leave] = []
    for meal in dict.fromkeys(meals):
        lv = existing.get(meal)
        if lv is None:
            lv = Leave(
                organization_id=org.id,
                member_id=member.id,
                date=d,
                meal_type=meal,
                reason=reason,
                status=status,
            )
            db.add(lv)
        elif lv.status is LeaveStatus.rejected:
            lv.status = status
            lv.reason = reason
            lv.decided_at = None
            lv.decided_by = None
        out.append(lv)
    await db.flush()
    return out


async def my_leaves(db: AsyncSession, member_id: int, start: date, end: date) -> list[Leave]:
    return list(
        (
            await db.execute(
                select(Leave)
                .where(Leave.member_id == member_id, Leave.date >= start, Leave.date <= end)
                .order_by(Leave.date, Leave.meal_type)
            )
        ).scalars()
    )


async def cancel_leave(db: AsyncSession, member_id: int, leave_id: int) -> None:
    lv = await db.get(Leave, leave_id)
    if lv is None or lv.member_id != member_id:
        raise ApiError(404, "LEAVE_NOT_FOUND", "Leave not found")
    if lv.date < now_ist().date():
        raise ApiError(409, "LEAVE_IN_PAST", "Past leaves cannot be cancelled")
    await assert_month_open(db, lv.organization_id, lv.date)
    await db.delete(lv)
    await db.flush()


async def list_leaves(
    db: AsyncSession, org_id: int, start: date, end: date, status: LeaveStatus | None
) -> list[tuple[Leave, Member]]:
    q = (
        select(Leave, Member)
        .join(Member, Member.id == Leave.member_id)
        .where(Leave.organization_id == org_id, Leave.date >= start, Leave.date <= end)
        .order_by(Leave.date, Member.name, Leave.meal_type)
    )
    if status is not None:
        q = q.where(Leave.status == status)
    return [(lv, m) for lv, m in (await db.execute(q)).unique()]


async def decide(
    db: AsyncSession, org_id: int, leave_id: int, approve: bool, decided_by: int
) -> tuple[Leave, Member]:
    lv = await db.get(Leave, leave_id)
    if lv is None or lv.organization_id != org_id:
        raise ApiError(404, "LEAVE_NOT_FOUND", "Leave not found")
    member = await db.get(Member, lv.member_id)
    assert member is not None
    lv.status = LeaveStatus.approved if approve else LeaveStatus.rejected
    lv.decided_by = decided_by
    lv.decided_at = datetime.now(UTC)
    await db.flush()
    if member.user_id:
        meal = "Lunch" if lv.meal_type is MealType.lunch else "Dinner"
        await notify(
            db,
            org_id,
            member.user_id,
            NotificationType.leave_decided,
            f"Leave {'approved' if approve else 'rejected'}: {meal} on {lv.date:%d %b}",
            None
            if approve
            else "Your late leave was not accepted. You are expected for this meal.",
            ref=("leave", lv.id),
        )
    return lv, member
