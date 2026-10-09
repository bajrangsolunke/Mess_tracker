"""One-month membership periods: renewal by the owner, renewal requests from members."""

from datetime import UTC, date, datetime, timedelta

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.core.time import membership_end, now_ist, today_ist
from app.models import Bill, Member, MemberStatus, MessPlan, NotificationType, User, UserRole
from app.schemas.attendance import MemberBrief
from app.schemas.billing import DueRow, MembershipInfo
from app.schemas.plan import PlanOut
from app.services import credits
from app.services.billing import create_period_bill
from app.services.members import get_member, get_plan
from app.services.notifications import notify

DUE_WINDOW_DAYS = 5

__all__ = ["now_ist", "renew", "request_renewal", "cancel_request", "due", "info"]


def next_start(valid_until: date | None, today: date) -> date:
    if valid_until is None:
        return today
    following = valid_until + timedelta(days=1)
    return following if following >= today else today


async def renew(
    db: AsyncSession,
    org_id: int,
    member_id: int,
    plan_id: int | None,
    start: date | None,
) -> tuple[Member, Bill]:
    m = await get_member(db, org_id, member_id)
    today = today_ist()
    if start is None:
        # tiffins used up before the end date: the new pack starts today
        periods = (await credits.member_periods(db, [m.id])).get(m.id)
        used_up = periods and credits.can_eat(periods, today) == "NO_TIFFINS_LEFT"
        start = today if used_up else next_start(m.valid_until, today)
    begin = start
    end = membership_end(begin)
    chosen = plan_id or m.renewal_plan_id
    amount = m.monthly_fee
    meal_credits = m.plan.meal_credits
    if chosen and chosen != m.plan_id:
        plan = await get_plan(db, org_id, chosen)
        amount = plan.monthly_fee
        meal_credits = plan.meal_credits
        if begin <= today:
            m.plan_id, m.monthly_fee = plan.id, plan.monthly_fee
            m.next_plan_id = m.next_plan_from = None
        else:
            # current period keeps its plan; the switch happens when the new period starts
            m.next_plan_id, m.next_plan_from = plan.id, begin
    bill = await create_period_bill(db, m, begin, end, amount, meal_credits)
    m.valid_until = end
    m.renewal_plan_id = None
    m.renewal_requested_at = None
    if m.status is not MemberStatus.active:
        m.status = MemberStatus.active
        m.inactive_from = None
        if m.user_id:
            user = await db.get(User, m.user_id)
            if user:
                user.is_active = True
    await db.flush()
    await db.refresh(m)
    if m.user_id:
        await notify(
            db,
            org_id,
            m.user_id,
            NotificationType.general,
            f"Membership renewed till {end:%d %b %Y}",
            f"Amount ₹{bill.amount:.0f}. Please pay at the counter or via UPI.",
            ref=("bill", bill.id),
            url="/app/payments",
        )
    return m, bill


async def request_renewal(db: AsyncSession, member: Member, plan_id: int) -> Member:
    plan = await get_plan(db, member.organization_id, plan_id)
    if not plan.is_active:
        raise ApiError(422, "PLAN_INACTIVE", "This plan is not available")
    member.renewal_plan_id = plan.id
    member.renewal_requested_at = datetime.now(UTC)
    await db.flush()
    owners = (
        await db.execute(
            select(User.id).where(
                User.organization_id == member.organization_id,
                User.role == UserRole.owner,
                User.is_active.is_(True),
            )
        )
    ).scalars()
    for uid in owners:
        await notify(
            db,
            member.organization_id,
            uid,
            NotificationType.general,
            f"Renewal request: {member.name} — {plan.name}",
            None,
            ref=("member", member.id),
            url=f"/owner/members/{member.id}",
        )
    await db.refresh(member)
    return member


async def cancel_request(db: AsyncSession, member: Member) -> Member:
    member.renewal_plan_id = None
    member.renewal_requested_at = None
    await db.flush()
    await db.refresh(member)
    return member


async def due(db: AsyncSession, org_id: int, today: date | None = None) -> list[DueRow]:
    """Members to renew: period ending soon, tiffins used up, or renewal requested."""
    today = today or today_ist()
    rows = (
        (
            await db.execute(
                select(Member)
                .where(
                    Member.organization_id == org_id,
                    Member.valid_until.is_not(None),
                    or_(
                        Member.status == MemberStatus.active,
                        Member.renewal_requested_at.is_not(None),
                    ),
                )
                .order_by(Member.valid_until, Member.name)
            )
        )
        .scalars()
        .unique()
        .all()
    )
    periods = await credits.member_periods(db, [m.id for m in rows])
    out = []
    for m in rows:
        ps = periods.get(m.id)
        used_up = bool(ps) and credits.can_eat(ps, today) == "NO_TIFFINS_LEFT"
        ending = m.status is MemberStatus.active and m.valid_until <= today + timedelta(
            days=DUE_WINDOW_DAYS
        )
        if not (ending or used_up or m.renewal_requested_at):
            continue
        out.append(
            DueRow(
                member=MemberBrief.model_validate(m),
                valid_until=m.valid_until,
                days_left=(m.valid_until - today).days,
                renewal_plan=PlanOut.model_validate(m.renewal_plan) if m.renewal_plan else None,
                renewal_requested_at=m.renewal_requested_at,
                credits=credits.credit_out(ps, today) if ps else None,
                used_up=used_up,
            )
        )
    # tiffins used up first, then by end date
    return sorted(out, key=lambda r: (not r.used_up, r.valid_until))


def info(member: Member, today: date | None = None) -> MembershipInfo:
    today = today or today_ist()
    vu = member.valid_until
    return MembershipInfo(
        valid_until=vu,
        days_left=(vu - today).days if vu else None,
        expired=bool(vu and vu < today),
        renewal_plan=PlanOut.model_validate(member.renewal_plan) if member.renewal_plan else None,
        renewal_requested_at=member.renewal_requested_at,
    )


async def active_plans(db: AsyncSession, org_id: int) -> list[MessPlan]:
    return list(
        (
            await db.execute(
                select(MessPlan)
                .where(MessPlan.organization_id == org_id, MessPlan.is_active.is_(True))
                .order_by(MessPlan.monthly_fee)
            )
        ).scalars()
    )


async def apply_pending_plans(db: AsyncSession, org_id: int) -> int:
    """Switch members to their booked plan once the new period has started."""
    today = today_ist()
    rows = (
        (
            await db.execute(
                select(Member).where(
                    Member.organization_id == org_id,
                    Member.next_plan_id.is_not(None),
                    Member.next_plan_from <= today,
                )
            )
        )
        .scalars()
        .unique()
        .all()
    )
    for m in rows:
        plan = await db.get(MessPlan, m.next_plan_id)
        if plan is not None:
            m.plan_id, m.monthly_fee = plan.id, plan.monthly_fee
        m.next_plan_id = m.next_plan_from = None
    if rows:
        await db.flush()
        for m in rows:
            await db.refresh(m)
    return len(rows)
