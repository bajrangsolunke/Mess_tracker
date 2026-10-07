from collections.abc import Sequence
from datetime import UTC, date, datetime

from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.core.time import month_end, month_start
from app.models import (
    Attendance,
    AttendanceStatus,
    Holiday,
    HolidayMeal,
    Leave,
    LeaveStatus,
    MealType,
    Member,
    MemberStatus,
    MessPlan,
    MonthClosure,
)
from app.schemas.attendance import (
    AttendanceCounts,
    AttendanceRow,
    AttendanceSheet,
    HistoryItem,
    HistoryOut,
    HolidayOut,
    MemberBrief,
    SummaryRow,
)

# --- month closure --------------------------------------------------------------


async def is_month_closed(db: AsyncSession, org_id: int, d: date) -> bool:
    row = await db.execute(
        select(MonthClosure.id).where(
            MonthClosure.organization_id == org_id, MonthClosure.month == month_start(d)
        )
    )
    return row.first() is not None


async def assert_month_open(db: AsyncSession, org_id: int, d: date) -> None:
    if await is_month_closed(db, org_id, d):
        raise ApiError(409, "MONTH_CLOSED", f"{d:%B %Y} is closed; reopen it to edit")


async def close_month(db: AsyncSession, org_id: int, month: date, user_id: int) -> None:
    if await is_month_closed(db, org_id, month):
        return
    db.add(
        MonthClosure(
            organization_id=org_id, month=month, closed_at=datetime.now(UTC), closed_by=user_id
        )
    )
    await db.flush()


async def reopen_month(db: AsyncSession, org_id: int, month: date) -> None:
    row = (
        await db.execute(
            select(MonthClosure).where(
                MonthClosure.organization_id == org_id, MonthClosure.month == month
            )
        )
    ).scalar_one_or_none()
    if row:
        await db.delete(row)
        await db.flush()


async def closed_months(db: AsyncSession, org_id: int, year: int) -> set[date]:
    rows = await db.execute(
        select(MonthClosure.month).where(
            MonthClosure.organization_id == org_id,
            MonthClosure.month >= date(year, 1, 1),
            MonthClosure.month <= date(year, 12, 1),
        )
    )
    return {r[0] for r in rows}


# --- holidays -------------------------------------------------------------------


async def holiday_for(db: AsyncSession, org_id: int, d: date, meal: MealType) -> Holiday | None:
    return (
        await db.execute(
            select(Holiday).where(
                Holiday.organization_id == org_id,
                Holiday.date == d,
                Holiday.meal_type.in_([HolidayMeal.all, HolidayMeal(meal.value)]),
            )
        )
    ).scalar_one_or_none()


async def list_holidays(db: AsyncSession, org_id: int, start: date, end: date) -> Sequence[Holiday]:
    return (
        (
            await db.execute(
                select(Holiday)
                .where(
                    Holiday.organization_id == org_id, Holiday.date >= start, Holiday.date <= end
                )
                .order_by(Holiday.date)
            )
        )
        .scalars()
        .all()
    )


# --- expected members -------------------------------------------------------------


def _meal_column(meal: MealType):
    return MessPlan.includes_lunch if meal is MealType.lunch else MessPlan.includes_dinner


async def expected_members(db: AsyncSession, org_id: int, d: date, meal: MealType) -> list[Member]:
    """Active members whose plan includes the meal, who had joined by `d`, and were not
    deactivated before `d`. Approved leaves are reported separately (not excluded here)."""
    q = (
        select(Member)
        .join(MessPlan, MessPlan.id == Member.plan_id)
        .where(
            Member.organization_id == org_id,
            Member.joining_date <= d,
            or_(Member.valid_until.is_(None), Member.valid_until >= d),
            _meal_column(meal).is_(True),
            or_(
                Member.status == MemberStatus.active,
                and_(Member.status == MemberStatus.inactive, Member.inactive_from > d),
            ),
        )
        .order_by(Member.name)
    )
    return list((await db.execute(q)).scalars().unique())


async def _leaves_for(db: AsyncSession, org_id: int, d: date, meal: MealType) -> dict[int, Leave]:
    rows = (
        await db.execute(
            select(Leave).where(
                Leave.organization_id == org_id,
                Leave.date == d,
                Leave.meal_type == meal,
                Leave.status != LeaveStatus.rejected,
            )
        )
    ).scalars()
    return {lv.member_id: lv for lv in rows}


async def sheet(db: AsyncSession, org_id: int, d: date, meal: MealType) -> AttendanceSheet:
    locked = await is_month_closed(db, org_id, d)
    hol = await holiday_for(db, org_id, d, meal)
    if hol is not None:
        return AttendanceSheet(
            date=d,
            meal_type=meal,
            locked=locked,
            holiday=HolidayOut.model_validate(hol),
            counts=AttendanceCounts(expected=0, present=0, absent=0, unmarked=0, on_leave=0),
            items=[],
        )
    members = await expected_members(db, org_id, d, meal)
    leaves = await _leaves_for(db, org_id, d, meal)
    rows_att = {
        a.member_id: a
        for a in (
            await db.execute(
                select(Attendance).where(
                    Attendance.organization_id == org_id,
                    Attendance.date == d,
                    Attendance.meal_type == meal,
                )
            )
        ).scalars()
    }
    marks = {mid: a.status for mid, a in rows_att.items()}
    items: list[AttendanceRow] = []
    present = absent = unmarked = on_leave = 0
    for m in members:
        lv = leaves.get(m.id)
        approved_leave = lv is not None and lv.status is LeaveStatus.approved
        status = marks.get(m.id)
        if approved_leave and status is None:
            on_leave += 1
        elif status is AttendanceStatus.present:
            present += 1
        elif status is AttendanceStatus.absent:
            absent += 1
        else:
            unmarked += 1
        items.append(
            AttendanceRow(
                member=MemberBrief.model_validate(m),
                status=status,
                on_leave=approved_leave,
                leave_status=lv.status.value if lv else None,
                self_marked=bool(
                    m.user_id and m.id in rows_att and rows_att[m.id].marked_by == m.user_id
                ),
            )
        )
    return AttendanceSheet(
        date=d,
        meal_type=meal,
        locked=locked,
        holiday=None,
        counts=AttendanceCounts(
            expected=len(members),
            present=present,
            absent=absent,
            unmarked=unmarked,
            on_leave=on_leave,
        ),
        items=items,
    )


async def bulk_mark(
    db: AsyncSession,
    org_id: int,
    d: date,
    meal: MealType,
    items: list[tuple[int, AttendanceStatus]],
    user_id: int,
) -> None:
    await assert_month_open(db, org_id, d)
    if not items:
        return
    ids = {mid for mid, _ in items}
    known = {
        r[0]
        for r in await db.execute(
            select(Member.id).where(Member.organization_id == org_id, Member.id.in_(ids))
        )
    }
    missing = ids - known
    if missing:
        raise ApiError(404, "MEMBER_NOT_FOUND", f"Unknown member ids: {sorted(missing)}")
    stmt = insert(Attendance).values(
        [
            {
                "organization_id": org_id,
                "member_id": mid,
                "date": d,
                "meal_type": meal,
                "status": st,
                "marked_by": user_id,
            }
            for mid, st in items
        ]
    )
    stmt = stmt.on_conflict_do_update(
        constraint="uq_attendance_member_date_meal",
        set_={
            "status": stmt.excluded.status,
            "marked_by": stmt.excluded.marked_by,
            "updated_at": func.now(),
        },
    )
    await db.execute(stmt)
    await db.flush()


async def mark_all(
    db: AsyncSession, org_id: int, d: date, meal: MealType, status: AttendanceStatus, user_id: int
) -> None:
    members = await expected_members(db, org_id, d, meal)
    leaves = await _leaves_for(db, org_id, d, meal)
    targets = [
        (m.id, status)
        for m in members
        if not (
            status is AttendanceStatus.present
            and leaves.get(m.id)
            and leaves[m.id].status is LeaveStatus.approved
        )
    ]
    await bulk_mark(db, org_id, d, meal, targets, user_id)


# --- history / summary -----------------------------------------------------------


async def history(db: AsyncSession, org_id: int, member: Member, month: date) -> HistoryOut:
    start, end = month_start(month), month_end(month)
    rows = (
        (
            await db.execute(
                select(Attendance)
                .where(
                    Attendance.organization_id == org_id,
                    Attendance.member_id == member.id,
                    Attendance.date >= start,
                    Attendance.date <= end,
                )
                .order_by(Attendance.date, Attendance.meal_type)
            )
        )
        .scalars()
        .all()
    )
    leaves = (
        (
            await db.execute(
                select(Leave).where(
                    Leave.member_id == member.id,
                    Leave.date >= start,
                    Leave.date <= end,
                    Leave.status == LeaveStatus.approved,
                )
            )
        )
        .scalars()
        .all()
    )
    items = [HistoryItem(date=a.date, meal_type=a.meal_type, status=a.status) for a in rows]
    return HistoryOut(
        member=MemberBrief.model_validate(member),
        month=start,
        present_count=sum(1 for a in rows if a.status is AttendanceStatus.present),
        absent_count=sum(1 for a in rows if a.status is AttendanceStatus.absent),
        items=items,
        leaves=[
            HistoryItem(date=lv.date, meal_type=lv.meal_type, status=AttendanceStatus.absent)
            for lv in leaves
        ],
    )


async def summary(db: AsyncSession, org_id: int, month: date) -> list[SummaryRow]:
    start, end = month_start(month), month_end(month)
    present = Attendance.status == AttendanceStatus.present
    q = (
        select(
            Member,
            func.coalesce(
                func.sum(case((and_(present, Attendance.meal_type == MealType.lunch), 1), else_=0)),
                0,
            ),
            func.coalesce(
                func.sum(
                    case((and_(present, Attendance.meal_type == MealType.dinner), 1), else_=0)
                ),
                0,
            ),
        )
        .outerjoin(
            Attendance,
            and_(
                Attendance.member_id == Member.id, Attendance.date >= start, Attendance.date <= end
            ),
        )
        .where(Member.organization_id == org_id)
        .group_by(Member.id)
        .order_by(Member.name)
    )
    out: list[SummaryRow] = []
    for m, lunch, dinner in (await db.execute(q)).unique():
        out.append(
            SummaryRow(
                member=MemberBrief.model_validate(m),
                lunch_present=int(lunch),
                dinner_present=int(dinner),
                total_present=int(lunch) + int(dinner),
            )
        )
    return out


async def register(db: AsyncSession, org_id: int, month: date):
    """Notebook-style month grid: every member who was active at some point in the month."""
    from app.schemas.attendance import Register, RegisterHoliday, RegisterRow

    start, end = month_start(month), month_end(month)
    members = (
        (
            await db.execute(
                select(Member)
                .where(
                    Member.organization_id == org_id,
                    Member.joining_date <= end,
                    or_(Member.status == MemberStatus.active, Member.inactive_from >= start),
                )
                .order_by(Member.name)
            )
        )
        .scalars()
        .unique()
        .all()
    )
    marks: dict[int, dict[str, dict[str, AttendanceStatus]]] = {m.id: {} for m in members}
    for a in (
        await db.execute(
            select(Attendance).where(
                Attendance.organization_id == org_id,
                Attendance.date >= start,
                Attendance.date <= end,
            )
        )
    ).scalars():
        if a.member_id in marks:
            marks[a.member_id].setdefault(a.date.isoformat(), {})[a.meal_type.value] = a.status
    hols = await list_holidays(db, org_id, start, end)
    rows = [
        RegisterRow(
            member=MemberBrief.model_validate(m),
            joining_date=m.joining_date,
            inactive_from=m.inactive_from,
            valid_until=m.valid_until,
            marks=marks[m.id],
            present=sum(
                1
                for day in marks[m.id].values()
                for st in day.values()
                if st is AttendanceStatus.present
            ),
        )
        for m in members
    ]
    return Register(
        month=start,
        days=(end - start).days + 1,
        locked=await is_month_closed(db, org_id, start),
        holidays=[RegisterHoliday(date=h.date, meal_type=h.meal_type) for h in hols],
        rows=rows,
    )
