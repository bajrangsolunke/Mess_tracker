from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.core.time import month_end
from app.models import (
    Bill,
    BillStatus,
    Member,
    MemberStatus,
    Notification,
    NotificationType,
    Payment,
)
from app.schemas.attendance import MemberBrief
from app.schemas.billing import BillOut, BillPage, BillTotals, PaymentCreate, PaymentOut
from app.services.notifications import notify

ZERO = Decimal("0.00")


def _paid(bill: Bill) -> Decimal:
    return sum((p.amount for p in bill.payments), ZERO)


def _status(bill: Bill) -> BillStatus:
    paid = _paid(bill)
    if paid <= 0:
        return BillStatus.unpaid
    return BillStatus.paid if paid >= bill.amount else BillStatus.partial


def to_out(bill: Bill, member: Member) -> BillOut:
    paid = _paid(bill)
    return BillOut(
        id=bill.id,
        member=MemberBrief.model_validate(member),
        month=bill.month,
        period_start=bill.period_start,
        period_end=bill.period_end,
        amount=bill.amount,
        paid=paid,
        due=max(bill.amount - paid, ZERO),
        status=bill.status,
        note=bill.note,
        payments=[PaymentOut.model_validate(p) for p in bill.payments],
    )


async def get_bill(db: AsyncSession, org_id: int, bill_id: int) -> tuple[Bill, Member]:
    row = (
        await db.execute(
            select(Bill, Member)
            .join(Member, Member.id == Bill.member_id)
            .where(Bill.id == bill_id, Bill.organization_id == org_id)
        )
    ).first()
    if row is None:
        raise ApiError(404, "BILL_NOT_FOUND", "Bill not found")
    return row[0], row[1]


async def generate(db: AsyncSession, org_id: int, month: date) -> tuple[int, int]:
    """Legacy calendar-month bills for members without a membership period (valid_until IS NULL).
    Period members get their bill on enrollment and renewal instead."""
    end = month_end(month)
    members = (
        (
            await db.execute(
                select(Member).where(
                    Member.organization_id == org_id,
                    Member.joining_date <= end,
                    Member.valid_until.is_(None),
                    or_(
                        Member.status == MemberStatus.active,
                        and_(Member.status == MemberStatus.inactive, Member.inactive_from > month),
                    ),
                )
            )
        )
        .scalars()
        .unique()
    )
    existing = {
        r[0]
        for r in await db.execute(
            select(Bill.member_id).where(Bill.organization_id == org_id, Bill.month == month)
        )
    }
    created = 0
    for m in members:
        if m.id in existing:
            continue
        db.add(Bill(organization_id=org_id, member_id=m.id, month=month, amount=m.monthly_fee))
        created += 1
    await db.flush()
    total = (
        await db.execute(
            select(func.count()).where(Bill.organization_id == org_id, Bill.month == month)
        )
    ).scalar_one()
    return created, total


async def list_bills(
    db: AsyncSession, org_id: int, month: date, status: BillStatus | None = None
) -> BillPage:
    q = (
        select(Bill, Member)
        .join(Member, Member.id == Bill.member_id)
        .where(Bill.organization_id == org_id, Bill.month == month)
        .order_by(Member.name)
    )
    rows = [(b, m) for b, m in (await db.execute(q)).unique()]
    outs = [to_out(b, m) for b, m in rows]
    billed = sum((o.amount for o in outs), ZERO)
    collected = sum((o.paid for o in outs), ZERO)
    totals = BillTotals(
        billed=billed,
        collected=collected,
        pending=max(billed - collected, ZERO),
        members=len(outs),
        paid=sum(1 for o in outs if o.status is BillStatus.paid),
    )
    if status is not None:
        outs = [o for o in outs if o.status is status]
    return BillPage(month=month, totals=totals, items=outs)


async def update_bill(
    db: AsyncSession,
    org_id: int,
    bill_id: int,
    amount: Decimal | None,
    note: str | None,
    note_set: bool,
) -> BillOut:
    bill, member = await get_bill(db, org_id, bill_id)
    if amount is not None:
        bill.amount = amount
    if note_set:
        bill.note = note
    bill.status = _status(bill)
    await db.flush()
    return to_out(bill, member)


async def record_payment(
    db: AsyncSession, org_id: int, bill_id: int, data: PaymentCreate, user_id: int
) -> BillOut:
    bill, member = await get_bill(db, org_id, bill_id)
    due = bill.amount - _paid(bill)
    if data.amount > due:
        raise ApiError(422, "OVERPAYMENT", f"Only {due:.2f} is due on this bill")
    payment = Payment(
        organization_id=org_id,
        bill_id=bill.id,
        amount=data.amount,
        method=data.method,
        paid_on=data.paid_on,
        note=data.note,
        recorded_by=user_id,
    )
    db.add(payment)
    await db.flush()
    await db.refresh(bill)
    bill.status = _status(bill)
    await db.flush()
    return to_out(bill, member)


async def delete_payment(db: AsyncSession, org_id: int, payment_id: int) -> BillOut:
    p = await db.get(Payment, payment_id)
    if p is None or p.organization_id != org_id:
        raise ApiError(404, "PAYMENT_NOT_FOUND", "Payment not found")
    bill_id = p.bill_id
    await db.delete(p)
    await db.flush()
    bill, member = await get_bill(db, org_id, bill_id)
    await db.refresh(bill)
    bill.status = _status(bill)
    await db.flush()
    return to_out(bill, member)


async def my_bills(db: AsyncSession, member: Member, limit: int = 12) -> list[BillOut]:
    rows = (
        (
            await db.execute(
                select(Bill)
                .where(Bill.member_id == member.id)
                .order_by(Bill.month.desc())
                .limit(limit)
            )
        )
        .scalars()
        .unique()
    )
    return [to_out(b, member) for b in rows]


async def send_payment_reminders(db: AsyncSession, org_id: int, month: date) -> int:
    """One `payment_due` notification per unpaid/partial bill, at most once per day."""
    page = await list_bills(db, org_id, month)
    since = datetime.now(UTC) - timedelta(hours=20)
    sent = 0
    for o in page.items:
        if o.status is BillStatus.paid:
            continue
        member = await db.get(Member, o.member.id)
        if member is None or member.user_id is None:
            continue
        recent = await db.execute(
            select(Notification.id).where(
                Notification.user_id == member.user_id,
                Notification.type == NotificationType.payment_due,
                Notification.ref_type == "bill",
                Notification.ref_id == o.id,
                Notification.created_at >= since,
            )
        )
        if recent.first():
            continue
        await notify(
            db,
            org_id,
            member.user_id,
            NotificationType.payment_due,
            f"Mess payment pending: ₹{o.due:.0f} for {month:%B %Y}",
            "Please pay at the counter or via UPI. Thank you!",
            ref=("bill", o.id),
        )
        sent += 1
    return sent


async def create_period_bill(db: AsyncSession, member: Member, start: date, end: date) -> Bill:
    """Bill for one membership period. Raises 409 PERIOD_EXISTS if that month is already billed."""
    from sqlalchemy.exc import IntegrityError

    from app.core.time import month_start

    bill = Bill(
        organization_id=member.organization_id,
        member_id=member.id,
        month=month_start(start),
        period_start=start,
        period_end=end,
        amount=member.monthly_fee,
    )
    try:
        async with db.begin_nested():
            db.add(bill)
            await db.flush()
    except IntegrityError as e:
        raise ApiError(
            409, "PERIOD_EXISTS", "A bill already exists for a period starting this month"
        ) from e
    await db.refresh(bill, ["payments"])
    return bill
