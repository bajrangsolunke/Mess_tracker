"""Tiffin packs: each membership period gives 30 (1 time) or 60 (2 times) tiffins.

Every meal marked present uses one tiffin, at either meal (a 1-time member may also come
for the other meal). Tiffins can be used from the period start until 6 days after it ends;
leftovers then lapse. While periods overlap (buffer days after a renewal) the older
leftovers are used first. When a pack is used up the membership is over until renewal.
"""

from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date, timedelta

from sqlalchemy import case, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.models import Attendance, AttendanceStatus, Bill, MealType
from app.schemas.credits import CreditOut

GRACE_DAYS = 6


@dataclass
class Period:
    start: date
    end: date
    total: int
    used: int = 0

    @property
    def use_by(self) -> date:
        return self.end + timedelta(days=GRACE_DAYS)

    @property
    def left(self) -> int:
        return max(self.total - self.used, 0)

    def covers(self, d: date) -> bool:
        return self.start <= d <= self.use_by


async def member_periods(
    db: AsyncSession,
    member_ids: Iterable[int],
    exclude: Iterable[tuple[int, date, MealType]] = (),
) -> dict[int, list[Period]]:
    """Tiffin periods per member with tiffins used, skipping marks listed in ``exclude``.
    Members without tiffin packs (unlimited plans, old bills) are absent from the result."""
    ids = list(set(member_ids))
    if not ids:
        return {}
    periods: dict[int, list[Period]] = defaultdict(list)
    for mid, start, end, total in await db.execute(
        select(Bill.member_id, Bill.period_start, Bill.period_end, Bill.meal_credits)
        .where(
            Bill.member_id.in_(ids),
            Bill.meal_credits.is_not(None),
            Bill.period_start.is_not(None),
            Bill.period_end.is_not(None),
        )
        .order_by(Bill.member_id, Bill.period_start)
    ):
        periods[mid].append(Period(start=start, end=end, total=total))
    if not periods:
        return {}
    skip = set(exclude)
    first = min(p.start for ps in periods.values() for p in ps)
    marks = await db.execute(
        select(Attendance.member_id, Attendance.date, Attendance.meal_type)
        .where(
            Attendance.member_id.in_(list(periods)),
            Attendance.status == AttendanceStatus.present,
            Attendance.date >= first,
        )
        .order_by(
            Attendance.date,
            case((Attendance.meal_type == MealType.lunch, 0), else_=1),
        )
    )
    for mid, d, meal in marks:
        if (mid, d, meal) in skip:
            continue
        ps = periods[mid]
        target = next((p for p in ps if p.covers(d) and p.left > 0), None)
        target = target or next((p for p in ps if p.covers(d)), None)
        if target is not None:
            target.used += 1
    return dict(periods)


def left_on(periods: list[Period], d: date) -> int:
    return sum(p.left for p in periods if p.covers(d))


def credit_out(periods: list[Period], d: date) -> CreditOut | None:
    """The pack in use on ``d`` (older leftovers first), else the latest one for reference."""
    covering = [p for p in periods if p.covers(d)]
    p = next((p for p in covering if p.left > 0), None) or (covering or periods or [None])[-1]
    if p is None:
        return None
    return CreditOut(
        total=p.total,
        used=min(p.used, p.total),
        left=left_on(periods, d) if covering else 0,
        start=p.start,
        end=p.end,
        use_by=p.use_by,
    )


async def credits_on(db: AsyncSession, member_ids: Iterable[int], d: date) -> dict[int, CreditOut]:
    periods = await member_periods(db, member_ids)
    out = {}
    for mid, ps in periods.items():
        c = credit_out(ps, d)
        if c is not None:
            out[mid] = c
    return out


def can_eat(periods: list[Period] | None, d: date) -> str | None:
    """None if a tiffin is available on ``d``, else the reason code."""
    if not periods:
        return None  # unlimited plan
    if not any(p.covers(d) for p in periods):
        return "MEMBERSHIP_EXPIRED"
    if left_on(periods, d) <= 0:
        return "NO_TIFFINS_LEFT"
    return None


async def check_present_marks(
    db: AsyncSession, d: date, meal: MealType, member_ids: list[int], names: dict[int, str]
) -> None:
    """Refuse a present mark when the member's tiffins are used up or the period is over."""
    if not member_ids:
        return
    periods = await member_periods(db, member_ids, exclude=[(m, d, meal) for m in member_ids])
    for mid in member_ids:
        reason = can_eat(periods.get(mid), d)
        if reason == "MEMBERSHIP_EXPIRED":
            raise ApiError(409, reason, f"{names.get(mid, '')}: membership is over; please renew")
        if reason == "NO_TIFFINS_LEFT":
            raise ApiError(409, reason, f"{names.get(mid, '')}: all tiffins are used; please renew")
