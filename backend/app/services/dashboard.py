from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.time import month_end, month_start
from app.models import (
    Attendance,
    AttendanceStatus,
    Bill,
    Leave,
    LeaveStatus,
    MealType,
    Member,
    MemberStatus,
    MemberType,
    Payment,
    PaymentMethod,
)
from app.schemas.attendance import MemberBrief
from app.schemas.dashboard import (
    CustomerDashboard,
    DayMeals,
    MealsReport,
    MealsTotals,
    MenuToday,
    MonthMoney,
    OwnerDashboard,
    PaymentsReport,
)
from app.schemas.leave import LeaveOut
from app.schemas.menu import AnnouncementOut
from app.services import attendance as att
from app.services import billing
from app.services.menus import list_announcements, list_menus
from app.services.notifications import list_for_user

ZERO = Decimal("0.00")


async def _menu_today(db: AsyncSession, org_id: int, d: date) -> MenuToday:
    rows = await list_menus(db, org_id, d, d)
    by = {m.meal_type: m.items for m in rows}
    return MenuToday(lunch=by.get(MealType.lunch, []), dinner=by.get(MealType.dinner, []))


async def _meals_served(db: AsyncSession, org_id: int, start: date, end: date) -> int:
    return (
        await db.execute(
            select(func.count()).where(
                Attendance.organization_id == org_id,
                Attendance.status == AttendanceStatus.present,
                Attendance.date >= start,
                Attendance.date <= end,
            )
        )
    ).scalar_one()


async def owner_dashboard(db: AsyncSession, org_id: int, d: date) -> OwnerDashboard:
    active = (
        await db.execute(
            select(func.count()).where(
                Member.organization_id == org_id, Member.status == MemberStatus.active
            )
        )
    ).scalar_one()
    tiffin = (
        await db.execute(
            select(func.count()).where(
                Member.organization_id == org_id,
                Member.status == MemberStatus.active,
                Member.member_type == MemberType.tiffin,
            )
        )
    ).scalar_one()
    lunch = await att.sheet(db, org_id, d, MealType.lunch)
    dinner = await att.sheet(db, org_id, d, MealType.dinner)
    bills = await billing.list_bills(db, org_id, month_start(d))
    late = (
        await db.execute(
            select(func.count()).where(
                Leave.organization_id == org_id, Leave.status == LeaveStatus.late, Leave.date >= d
            )
        )
    ).scalar_one()
    return OwnerDashboard(
        date=d,
        active_members=active,
        tiffin_members=tiffin,
        lunch=lunch.counts,
        dinner=dinner.counts,
        payments=bills.totals,
        menu=await _menu_today(db, org_id, d),
        late_leaves=late,
        meals_served_month=await _meals_served(db, org_id, month_start(d), month_end(d)),
        holiday_today=(lunch.holiday or dinner.holiday).reason
        if (lunch.holiday or dinner.holiday)
        else None,
    )


async def customer_dashboard(
    db: AsyncSession, org_id: int, member: Member, user_id: int, d: date
) -> CustomerDashboard:
    start, end = month_start(d), month_end(d)
    meals = (
        await db.execute(
            select(func.count()).where(
                Attendance.member_id == member.id,
                Attendance.status == AttendanceStatus.present,
                Attendance.date >= start,
                Attendance.date <= end,
            )
        )
    ).scalar_one()
    bill = (
        await db.execute(select(Bill).where(Bill.member_id == member.id, Bill.month == start))
    ).scalar_one_or_none()
    leaves = (
        await db.execute(
            select(Leave)
            .where(
                Leave.member_id == member.id, Leave.date >= d, Leave.status != LeaveStatus.rejected
            )
            .order_by(Leave.date, Leave.meal_type)
            .limit(6)
        )
    ).scalars()
    _, unread = await list_for_user(db, user_id, limit=1)
    return CustomerDashboard(
        date=d,
        member=MemberBrief.model_validate(member),
        meals_this_month=meals,
        bill=billing.to_out(bill, member) if bill else None,
        menu=await _menu_today(db, org_id, d),
        upcoming_leaves=[LeaveOut.model_validate(lv) for lv in leaves],
        unread_notifications=unread,
        announcements=[
            AnnouncementOut.model_validate(a) for a in await list_announcements(db, org_id, 3)
        ],
    )


async def meals_report(db: AsyncSession, org_id: int, month: date) -> MealsReport:
    start, end = month_start(month), month_end(month)
    present = Attendance.status == AttendanceStatus.present
    rows = await db.execute(
        select(
            Attendance.date,
            func.sum(case((Attendance.meal_type == MealType.lunch, 1), else_=0)),
            func.sum(case((Attendance.meal_type == MealType.dinner, 1), else_=0)),
        )
        .where(
            Attendance.organization_id == org_id,
            present,
            Attendance.date >= start,
            Attendance.date <= end,
        )
        .group_by(Attendance.date)
        .order_by(Attendance.date)
    )
    days = [DayMeals(date=r[0], lunch=int(r[1]), dinner=int(r[2])) for r in rows]
    tiffin = (
        await db.execute(
            select(func.count())
            .select_from(Attendance)
            .join(Member, Member.id == Attendance.member_id)
            .where(
                Attendance.organization_id == org_id,
                present,
                Attendance.date >= start,
                Attendance.date <= end,
                Member.member_type == MemberType.tiffin,
            )
        )
    ).scalar_one()
    lunch = sum(x.lunch for x in days)
    dinner = sum(x.dinner for x in days)
    return MealsReport(
        month=start,
        days=days,
        totals=MealsTotals(lunch=lunch, dinner=dinner, total=lunch + dinner, tiffin=tiffin),
    )


async def payments_report(db: AsyncSession, org_id: int, month: date) -> PaymentsReport:
    start = month_start(month)
    page = await billing.list_bills(db, org_id, start)
    by_method = {m.value: ZERO for m in PaymentMethod}
    rows = await db.execute(
        select(Payment.method, func.coalesce(func.sum(Payment.amount), 0))
        .join(Bill, Bill.id == Payment.bill_id)
        .where(Bill.organization_id == org_id, Bill.month == start)
        .group_by(Payment.method)
    )
    for method, amount in rows:
        by_method[method.value] = Decimal(amount)
    # last six months trend
    months: list[MonthMoney] = []
    m = start
    for _ in range(6):
        billed = (
            await db.execute(
                select(func.coalesce(func.sum(Bill.amount), 0)).where(
                    Bill.organization_id == org_id, Bill.month == m
                )
            )
        ).scalar_one()
        collected = (
            await db.execute(
                select(func.coalesce(func.sum(Payment.amount), 0))
                .join(Bill, Bill.id == Payment.bill_id)
                .where(Bill.organization_id == org_id, Bill.month == m)
            )
        ).scalar_one()
        months.append(MonthMoney(month=m, billed=Decimal(billed), collected=Decimal(collected)))
        m = (m.replace(day=1) - timedelta(days=1)).replace(day=1)
    months.reverse()
    return PaymentsReport(month=start, totals=page.totals, by_method=by_method, months=months)
