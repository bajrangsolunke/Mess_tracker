from collections.abc import Sequence
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import ApiError
from app.core.time import IST, month_end, month_start, now_ist
from app.models import (
    Attendance,
    AttendanceStatus,
    Holiday,
    HolidayMeal,
    Leave,
    LeaveStatus,
    MealClosure,
    MealType,
    Member,
    MemberStatus,
    MessPlan,
    MonthClosure,
    Organization,
    User,
)
from app.schemas.attendance import (
    AttendanceCounts,
    AttendanceRow,
    AttendanceSheet,
    HistoryItem,
    HistoryOut,
    HolidayOut,
    MemberBrief,
    SearchMeal,
    SearchRow,
    SummaryRow,
)
from app.services import credits

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
    members = list((await db.execute(q)).scalars().unique())
    # members whose tiffin pack is used up are not expected (unless already marked)
    periods = await credits.member_periods(db, [m.id for m in members])
    if not periods:
        return members
    marked = {
        r[0]
        for r in await db.execute(
            select(Attendance.member_id).where(
                Attendance.organization_id == org_id,
                Attendance.date == d,
                Attendance.meal_type == meal,
            )
        )
    }
    return [
        m
        for m in members
        if m.id in marked or m.id not in periods or credits.left_on(periods[m.id], d) > 0
    ]


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


def meal_end(org: Organization, d: date, meal: MealType) -> datetime:
    t = org.lunch_end_time if meal is MealType.lunch else org.dinner_end_time
    return datetime.combine(d, t, tzinfo=IST)


async def sheet(db: AsyncSession, org_id: int, d: date, meal: MealType) -> AttendanceSheet:
    locked = await is_month_closed(db, org_id, d)
    org = await db.get(Organization, org_id)
    ends_at = meal_end(org, d, meal) if org else None
    closed = bool(ends_at and now_ist() >= ends_at)
    hol = await holiday_for(db, org_id, d, meal)
    if hol is not None:
        return AttendanceSheet(
            date=d,
            meal_type=meal,
            locked=locked,
            closed=closed,
            ends_at=ends_at,
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
                select(Attendance)
                .where(
                    Attendance.organization_id == org_id,
                    Attendance.date == d,
                    Attendance.meal_type == meal,
                )
                .execution_options(populate_existing=True)
            )
        ).scalars()
    }
    expected_ids = {m.id for m in members}
    extra_ids = [mid for mid in rows_att if mid not in expected_ids]
    if extra_ids:
        # marked although not expected: a 1-time member's other meal, buffer days, ...
        members = members + list(
            (await db.execute(select(Member).where(Member.id.in_(extra_ids)))).scalars().unique()
        )
    left = {
        mid: c.left for mid, c in (await credits.credits_on(db, [m.id for m in members], d)).items()
    }
    marks = {mid: a.status for mid, a in rows_att.items()}
    marker_ids = {a.marked_by for a in rows_att.values() if a.marked_by and not a.auto}
    markers = (
        dict((await db.execute(select(User.id, User.name).where(User.id.in_(marker_ids)))).all())
        if marker_ids
        else {}
    )
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
                auto=bool(m.id in rows_att and rows_att[m.id].auto),
                marked_at=rows_att[m.id].marked_at if m.id in rows_att else None,
                marked_by_name=markers.get(rows_att[m.id].marked_by) if m.id in rows_att else None,
                tiffins_left=left.get(m.id),
                extra=m.id not in expected_ids,
            )
        )
    return AttendanceSheet(
        date=d,
        meal_type=meal,
        locked=locked,
        closed=closed,
        ends_at=ends_at,
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
    override: bool = False,
) -> None:
    """Record marks. A set mark is final unless ``override`` (owner correction) is given."""
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
    if not override:
        already = {
            r[0]
            for r in await db.execute(
                select(Attendance.member_id).where(
                    Attendance.organization_id == org_id,
                    Attendance.date == d,
                    Attendance.meal_type == meal,
                    Attendance.member_id.in_(ids),
                )
            )
        }
        if already:
            raise ApiError(
                409,
                "ATTENDANCE_LOCKED",
                "This attendance is already marked; only the owner can correct it",
            )
    present_ids = [mid for mid, st in items if st is AttendanceStatus.present]
    if present_ids:
        names = dict(
            (
                await db.execute(select(Member.id, Member.name).where(Member.id.in_(present_ids)))
            ).all()
        )
        await credits.check_present_marks(db, d, meal, present_ids, names)
    stmt = insert(Attendance).values(
        [
            {
                "organization_id": org_id,
                "member_id": mid,
                "date": d,
                "meal_type": meal,
                "status": st,
                "marked_by": user_id,
                "marked_at": now_ist(),
                "auto": False,
            }
            for mid, st in items
        ]
    )
    stmt = stmt.on_conflict_do_update(
        constraint="uq_attendance_member_date_meal",
        set_={
            "status": stmt.excluded.status,
            "marked_by": stmt.excluded.marked_by,
            "marked_at": stmt.excluded.marked_at,
            "auto": False,
            "updated_at": func.now(),
        },
    )
    await db.execute(stmt)
    await db.flush()


async def mark_all(
    db: AsyncSession, org_id: int, d: date, meal: MealType, status: AttendanceStatus, user_id: int
) -> None:
    """Mark every expected member who has no mark yet; existing marks are left alone."""
    members = await expected_members(db, org_id, d, meal)
    leaves = await _leaves_for(db, org_id, d, meal)
    marked = {
        r[0]
        for r in await db.execute(
            select(Attendance.member_id).where(
                Attendance.organization_id == org_id,
                Attendance.date == d,
                Attendance.meal_type == meal,
            )
        )
    }
    targets = [
        (m.id, status)
        for m in members
        if m.id not in marked
        and not (
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
    items = [
        HistoryItem(
            date=a.date,
            meal_type=a.meal_type,
            status=a.status,
            marked_at=a.marked_at,
            auto=a.auto,
            self_marked=bool(member.user_id and a.marked_by == member.user_id),
        )
        for a in rows
    ]
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


# --- missed meals → absent ------------------------------------------------------------

AUTO_CLOSE_LOOKBACK_DAYS = 45


async def auto_close(db: AsyncSession, org_id: int) -> int:
    """Record absent for every expected member with no mark once a meal's end time has passed.
    Approved leaves and holidays are skipped; closed months are left untouched.
    Idempotent: each (date, meal) is processed once and remembered in meal_closures."""
    if not settings.auto_close_meals:
        return 0
    org = await db.get(Organization, org_id)
    if org is None:
        return 0
    now = now_ist()
    first = (
        await db.execute(
            select(func.min(Member.joining_date)).where(Member.organization_id == org_id)
        )
    ).scalar_one_or_none()
    if first is None:
        return 0
    start = max(first, now.date() - timedelta(days=AUTO_CLOSE_LOOKBACK_DAYS))
    done = {
        (r[0], r[1])
        for r in await db.execute(
            select(MealClosure.date, MealClosure.meal_type).where(
                MealClosure.organization_id == org_id, MealClosure.date >= start
            )
        )
    }
    created = 0
    d = start
    while d <= now.date():
        for meal in (MealType.lunch, MealType.dinner):
            ends = meal_end(org, d, meal)
            if (d, meal) in done or now < ends:
                continue
            if (
                not await is_month_closed(db, org_id, d)
                and await holiday_for(db, org_id, d, meal) is None
            ):
                members = await expected_members(db, org_id, d, meal)
                leaves = await _leaves_for(db, org_id, d, meal)
                rows = [
                    {
                        "organization_id": org_id,
                        "member_id": m.id,
                        "date": d,
                        "meal_type": meal,
                        "status": AttendanceStatus.absent,
                        "marked_by": None,
                        "marked_at": ends,
                        "auto": True,
                    }
                    for m in members
                    if not (leaves.get(m.id) and leaves[m.id].status is LeaveStatus.approved)
                ]
                if rows:
                    res = await db.execute(
                        insert(Attendance)
                        .values(rows)
                        .on_conflict_do_nothing(constraint="uq_attendance_member_date_meal")
                    )
                    created += res.rowcount or 0
            closure = await db.execute(
                insert(MealClosure)
                .values(organization_id=org_id, date=d, meal_type=meal)
                .on_conflict_do_nothing(constraint="uq_meal_closures_org_date_meal")
            )
            if closure.rowcount and d == now.date():
                await _closing_summary(db, org_id, d, meal)
        d += timedelta(days=1)
    await db.flush()
    return created


async def _closing_summary(db: AsyncSession, org_id: int, d: date, meal: MealType) -> None:
    """Tell the owner how the meal went once its time is over."""
    from app.services import alerts
    from app.services.tiffin import day_sheet

    counts = {
        st: n
        for st, n in await db.execute(
            select(Attendance.status, func.count())
            .where(
                Attendance.organization_id == org_id,
                Attendance.date == d,
                Attendance.meal_type == meal,
            )
            .group_by(Attendance.status)
        )
    }
    tiffins = sum(
        r.veg + r.nonveg
        for r in (await day_sheet(db, org_id, d, False)).rows
        if r.meal_type is meal
    )
    await alerts.meal_closed(
        db,
        org_id,
        meal,
        counts.get(AttendanceStatus.present, 0),
        counts.get(AttendanceStatus.absent, 0),
        tiffins,
    )


async def ensure_closed(db: AsyncSession, org_id: int) -> None:
    """Called before reading attendance so missed meals already show as absent.
    Also sends the once-a-day reminders."""
    if settings.auto_close_meals:
        from app.services import alerts

        await auto_close(db, org_id)
        await alerts.daily(db, org_id)
        await db.commit()


async def search(db: AsyncSession, org_id: int, q: str, d: date) -> list[SearchRow]:
    """Members matching a name, phone or member number, with what can be marked on ``d``."""
    from app.core.phonetic import to_ascii_digits
    from app.services.members import search_ids

    q = to_ascii_digits(q.strip())
    if not q:
        return []
    ids = await search_ids(db, org_id, q)
    exact = int(q) if q.isdigit() and len(q) <= 9 else -1
    members = (
        (
            await db.execute(
                select(Member)
                .where(Member.organization_id == org_id, Member.id.in_(ids or [0]))
                .order_by(
                    case((Member.member_no == exact, 0), else_=1),
                    case((Member.status == MemberStatus.active, 0), else_=1),
                    Member.name,
                )
                .limit(20)
            )
        )
        .scalars()
        .unique()
        .all()
    )
    if not members:
        return []
    ids = [m.id for m in members]
    periods = await credits.member_periods(db, ids)
    marks = {
        (a.member_id, a.meal_type): a
        for a in (
            await db.execute(
                select(Attendance).where(Attendance.member_id.in_(ids), Attendance.date == d)
            )
        ).scalars()
    }
    marker_ids = {a.marked_by for a in marks.values() if a.marked_by and not a.auto}
    markers = (
        dict((await db.execute(select(User.id, User.name).where(User.id.in_(marker_ids)))).all())
        if marker_ids
        else {}
    )
    holidays = {meal: await holiday_for(db, org_id, d, meal) for meal in MealType}

    def meal_state(m: Member, meal: MealType) -> SearchMeal:
        a = marks.get((m.id, meal))
        reason = None
        if m.status is MemberStatus.inactive and (m.inactive_from is None or m.inactive_from <= d):
            reason = "INACTIVE"
        elif m.joining_date > d:
            reason = "NOT_STARTED"
        elif holidays[meal] is not None:
            reason = "HOLIDAY"
        elif m.id in periods:
            reason = credits.can_eat(periods[m.id], d)
        elif not (m.plan.includes_lunch if meal is MealType.lunch else m.plan.includes_dinner):
            reason = "MEAL_NOT_IN_PLAN"
        elif m.valid_until is not None and m.valid_until < d:
            reason = "MEMBERSHIP_EXPIRED"
        return SearchMeal(
            status=a.status if a else None,
            marked_at=a.marked_at if a else None,
            marked_by_name=markers.get(a.marked_by) if a else None,
            auto=bool(a and a.auto),
            allowed=a is None and reason is None,
            reason=reason,
        )

    return [
        SearchRow(
            member=MemberBrief.model_validate(m),
            active=m.status is MemberStatus.active,
            valid_until=m.valid_until,
            credits=credits.credit_out(periods[m.id], d) if m.id in periods else None,
            lunch=meal_state(m, MealType.lunch),
            dinner=meal_state(m, MealType.dinner),
        )
        for m in members
    ]
