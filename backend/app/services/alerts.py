"""What gets notified, to whom. Each function is called right after the action it reports.

Members (push to the phones that opened their link and allowed notifications):
  meal marked by staff/owner (with tiffins left), payment received, renewal, ending soon.
Owner (push + bell): staff entered company tiffins, a member's tiffins ran out,
  each meal's closing summary, memberships ending soon (daily).
Staff (push + bell): new member added, company tiffins entered by the owner,
  their own advance / salary entries.
"""

from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.time import today_ist
from app.models import (
    AttendanceStatus,
    LedgerKind,
    MealType,
    Member,
    MemberStatus,
    NotificationType,
    Organization,
    User,
    UserRole,
)
from app.services import credits, push
from app.services.push_messages import text, word

LOW_TIFFINS = 5
ENDING_SOON_DAYS = 2


def _rupees(v: Decimal | int) -> str:
    return f"₹{Decimal(v):,.0f}"


def _date(d: date) -> str:
    return d.strftime("%d %b")


async def meal_marked(
    db: AsyncSession,
    org_id: int,
    d: date,
    meal: MealType,
    items: list[tuple[int, AttendanceStatus]],
    marked_at_text: str,
) -> None:
    """Tell each member their meal was marked; tell the owner when a pack runs out."""
    if not items:
        return
    ids = [mid for mid, _ in items]
    periods = await credits.member_periods(db, ids)
    members = {
        m.id: m
        for m in (await db.execute(select(Member).where(Member.id.in_(ids)))).scalars().unique()
    }
    owners: list[User] | None = None
    for mid, status in items:
        m = members.get(mid)
        if m is None or not m.share_token:
            continue
        ps = periods.get(mid)
        left = credits.left_on(ps, d) if ps else None
        url = f"/m/{m.share_token}"
        if status is AttendanceStatus.present:

            def build(lang, left=left, meal=meal):
                extra = ""
                if left is not None:
                    key = (
                        "tiffins_over"
                        if left <= 0
                        else "tiffins_low"
                        if left <= LOW_TIFFINS
                        else "tiffins_left"
                    )
                    extra = text(key, lang, left=left)[1]
                return text(
                    "meal_present",
                    lang,
                    meal=word(meal.value, lang),
                    time=marked_at_text,
                    left=extra,
                )

        else:

            def build(lang, meal=meal):
                return text("meal_absent", lang, meal=word(meal.value, lang), date=_date(d))

        await push.send(db, org_id, build, url, member_ids=[mid], tag=f"meal-{d}-{meal.value}")
        if status is AttendanceStatus.present and ps and left is not None and left <= 0:
            if owners is None:
                owners = await push.staff_and_owners(db, org_id, [UserRole.owner])
            total = credits.credit_out(ps, d).total if credits.credit_out(ps, d) else 0
            await push.send(
                db,
                org_id,
                lambda lang, m=m, total=total: text(
                    "owner_pack_over", lang, name=m.name, no=m.member_no, total=total
                ),
                f"/owner/members/{m.id}",
                users=owners,
                inbox=NotificationType.membership,
                tag=f"pack-{m.id}",
            )


async def payment_received(
    db: AsyncSession, org_id: int, member: Member, amount: Decimal, due: Decimal
) -> None:
    if not member.share_token:
        return

    def build(lang):
        due_line = (
            text("due_line", lang, due=_rupees(due))[1] if due > 0 else text("paid_line", lang)[1]
        )
        return text("payment_received", lang, amount=_rupees(amount), due_line=due_line)

    await push.send(db, org_id, build, f"/m/{member.share_token}", member_ids=[member.id])


async def renewed(db: AsyncSession, org_id: int, member: Member, meal_credits: int | None) -> None:
    if not member.share_token or member.valid_until is None:
        return

    def build(lang):
        pack = text("pack_line", lang, count=meal_credits)[1] if meal_credits else ""
        return text("renewed", lang, till=_date(member.valid_until), pack=pack)

    await push.send(db, org_id, build, f"/m/{member.share_token}", member_ids=[member.id])


async def member_added(db: AsyncSession, org_id: int, member: Member, actor_id: int) -> None:
    staff = await push.staff_and_owners(db, org_id, [UserRole.staff, UserRole.owner], actor_id)
    if not staff:
        return
    plan = member.plan.name if member.plan else ""
    await push.send(
        db,
        org_id,
        lambda lang: text("new_member", lang, name=member.name, no=member.member_no, plan=plan),
        "/staff/attendance",
        users=staff,
        inbox=NotificationType.membership,
    )


async def tiffins_entered(
    db: AsyncSession, org_id: int, actor: User, d: date, rows: list[tuple[str, MealType, int, int]]
) -> None:
    """rows: (company, meal, veg, nonveg) that changed. Owner hears from staff and vice versa."""
    if not rows:
        return
    other = UserRole.owner if actor.role is UserRole.staff else UserRole.staff
    users = await push.staff_and_owners(db, org_id, [other], actor.id)
    if not users:
        return
    for meal in (MealType.lunch, MealType.dinner):
        part = [r for r in rows if r[1] is meal]
        if not part:
            continue

        def build(lang, part=part, meal=meal):
            lines = ", ".join(
                f"{c}: {v} {word('veg', lang)} + {n} {word('nonveg', lang)}" for c, _, v, n in part
            )
            return text(
                "tiffins_entered", lang, meal=word(meal.value, lang), lines=lines, who=actor.name
            )

        for u in users:
            url = f"/owner/tiffins?date={d}" if u.role is UserRole.owner else "/staff/tiffins"
            await push.send(
                db,
                org_id,
                build,
                url,
                users=[u],
                inbox=NotificationType.tiffin,
                tag=f"tiffin-{d}-{meal.value}",
            )


async def meal_closed(
    db: AsyncSession, org_id: int, meal: MealType, present: int, absent: int, tiffins: int
) -> None:
    owners = await push.staff_and_owners(db, org_id, [UserRole.owner])
    await push.send(
        db,
        org_id,
        lambda lang: text(
            "meal_closed",
            lang,
            meal=word(meal.value, lang),
            present=present,
            absent=absent,
            tiffins=tiffins,
        ),
        "/owner/attendance",
        users=owners,
        tag=f"closed-{meal.value}",
    )


async def staff_money(
    db: AsyncSession, org_id: int, staff_user_id: int, kind: LedgerKind, amount: Decimal, d: date
) -> None:
    user = await db.get(User, staff_user_id)
    if user is None:
        return
    await push.send(
        db,
        org_id,
        lambda lang: text(
            "staff_money", lang, kind=word(kind.value, lang), amount=_rupees(amount), date=_date(d)
        ),
        "/staff/me",
        users=[user],
        inbox=NotificationType.staff,
    )


async def daily(db: AsyncSession, org_id: int) -> None:
    """Once a day (on the first request): memberships ending in 2 days."""
    org = await db.get(Organization, org_id)
    today = today_ist()
    if org is None or org.last_daily_run == today:
        return
    org.last_daily_run = today
    target = today + timedelta(days=ENDING_SOON_DAYS)
    ending = (
        (
            await db.execute(
                select(Member).where(
                    Member.organization_id == org_id,
                    Member.status == MemberStatus.active,
                    Member.valid_until == target,
                )
            )
        )
        .scalars()
        .unique()
        .all()
    )
    for m in ending:
        if m.share_token:
            await push.send(
                db,
                org_id,
                lambda lang, m=m: text("ending_soon", lang, till=_date(m.valid_until)),
                f"/m/{m.share_token}",
                member_ids=[m.id],
            )
    if ending:
        owners = await push.staff_and_owners(db, org_id, [UserRole.owner])
        names = ", ".join(f"{m.name} #{m.member_no}" for m in ending[:6])
        await push.send(
            db,
            org_id,
            lambda lang: text("ending_soon_owner", lang, count=len(ending), names=names),
            "/owner/renewals",
            users=owners,
            inbox=NotificationType.membership,
        )
    await db.flush()
