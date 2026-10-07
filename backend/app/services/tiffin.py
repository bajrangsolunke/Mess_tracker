from collections import defaultdict
from datetime import date
from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.core.time import month_end, month_start
from app.models import MealType, TiffinClient, TiffinOrder, TiffinPayment
from app.schemas.tiffin import (
    BulkToday,
    CountTotals,
    OrderItem,
    OrderRow,
    OrderSheet,
    OrderTotals,
    Statement,
    StatementDay,
    SummaryRow,
    SummaryTotals,
    TiffinClientCreate,
    TiffinClientOut,
    TiffinClientUpdate,
    TiffinPaymentCreate,
    TiffinPaymentOut,
    TiffinSummary,
)
from app.services.attendance import assert_month_open, is_month_closed

ZERO = Decimal("0.00")


def _amount(o: TiffinOrder) -> Decimal:
    return o.veg_count * o.veg_rate + o.nonveg_count * o.nonveg_rate


# --- clients ---------------------------------------------------------------------


async def list_clients(db: AsyncSession, org_id: int) -> list[TiffinClient]:
    q = (
        select(TiffinClient)
        .where(TiffinClient.organization_id == org_id)
        .order_by(TiffinClient.is_active.desc(), TiffinClient.name)
    )
    return list((await db.execute(q)).scalars())


async def get_client(db: AsyncSession, org_id: int, client_id: int) -> TiffinClient:
    c = await db.get(TiffinClient, client_id)
    if c is None or c.organization_id != org_id:
        raise ApiError(404, "TIFFIN_CLIENT_NOT_FOUND", "Tiffin client not found")
    return c


async def create_client(db: AsyncSession, org_id: int, data: TiffinClientCreate) -> TiffinClient:
    c = TiffinClient(organization_id=org_id, **data.model_dump())
    db.add(c)
    await db.flush()
    return c


async def update_client(
    db: AsyncSession, org_id: int, client_id: int, data: TiffinClientUpdate
) -> TiffinClient:
    c = await get_client(db, org_id, client_id)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    await db.flush()
    return c


# --- daily orders ------------------------------------------------------------------


async def sheet(db: AsyncSession, org_id: int, d: date, meal: MealType) -> OrderSheet:
    orders = {
        o.client_id: o
        for o in (
            await db.execute(
                select(TiffinOrder).where(
                    TiffinOrder.organization_id == org_id,
                    TiffinOrder.date == d,
                    TiffinOrder.meal_type == meal,
                )
            )
        ).scalars()
    }
    clients = (
        await db.execute(
            select(TiffinClient)
            .where(
                TiffinClient.organization_id == org_id,
                or_(TiffinClient.is_active.is_(True), TiffinClient.id.in_(list(orders) or [0])),
            )
            .order_by(TiffinClient.name)
        )
    ).scalars()
    rows: list[OrderRow] = []
    veg = nonveg = 0
    amount = ZERO
    for c in clients:
        o = orders.get(c.id)
        rows.append(
            OrderRow(
                client=TiffinClientOut.model_validate(c),
                veg_count=o.veg_count if o else 0,
                nonveg_count=o.nonveg_count if o else 0,
                note=o.note if o else None,
            )
        )
        if o:
            veg += o.veg_count
            nonveg += o.nonveg_count
            amount += _amount(o)
    return OrderSheet(
        date=d,
        meal_type=meal,
        locked=await is_month_closed(db, org_id, d),
        totals=OrderTotals(veg=veg, nonveg=nonveg, total=veg + nonveg, amount=amount),
        items=rows,
    )


async def put_orders(
    db: AsyncSession, org_id: int, d: date, meal: MealType, items: list[OrderItem]
) -> None:
    await assert_month_open(db, org_id, d)
    for it in items:
        c = await get_client(db, org_id, it.client_id)
        existing = (
            await db.execute(
                select(TiffinOrder).where(
                    TiffinOrder.client_id == c.id,
                    TiffinOrder.date == d,
                    TiffinOrder.meal_type == meal,
                )
            )
        ).scalar_one_or_none()
        if it.veg_count == 0 and it.nonveg_count == 0:
            if existing:
                await db.delete(existing)
            continue
        if existing is None:
            existing = TiffinOrder(organization_id=org_id, client_id=c.id, date=d, meal_type=meal)
            db.add(existing)
        existing.veg_count = it.veg_count
        existing.nonveg_count = it.nonveg_count
        existing.veg_rate = c.veg_rate
        existing.nonveg_rate = c.nonveg_rate
        existing.note = it.note
    await db.flush()


async def copy_day(db: AsyncSession, org_id: int, src: date, dst: date) -> int:
    await assert_month_open(db, org_id, dst)
    rows = (
        (
            await db.execute(
                select(TiffinOrder).where(
                    TiffinOrder.organization_id == org_id, TiffinOrder.date == src
                )
            )
        )
        .scalars()
        .all()
    )
    by_meal: dict[MealType, list[OrderItem]] = defaultdict(list)
    for o in rows:
        by_meal[o.meal_type].append(
            OrderItem(
                client_id=o.client_id,
                veg_count=o.veg_count,
                nonveg_count=o.nonveg_count,
                note=o.note,
            )
        )
    for meal, items in by_meal.items():
        await put_orders(db, org_id, dst, meal, items)
    return len(rows)


# --- statements & payments -----------------------------------------------------------


async def _orders_in_month(
    db: AsyncSession, org_id: int, month: date, client_id: int | None = None
):
    q = select(TiffinOrder).where(
        TiffinOrder.organization_id == org_id,
        TiffinOrder.date >= month_start(month),
        TiffinOrder.date <= month_end(month),
    )
    if client_id is not None:
        q = q.where(TiffinOrder.client_id == client_id)
    return (await db.execute(q.order_by(TiffinOrder.date))).scalars().all()


async def _payments(db: AsyncSession, org_id: int, month: date, client_id: int | None = None):
    q = select(TiffinPayment).where(
        TiffinPayment.organization_id == org_id, TiffinPayment.month == month_start(month)
    )
    if client_id is not None:
        q = q.where(TiffinPayment.client_id == client_id)
    return (await db.execute(q.order_by(TiffinPayment.paid_on, TiffinPayment.id))).scalars().all()


async def statement(db: AsyncSession, org_id: int, client_id: int, month: date) -> Statement:
    c = await get_client(db, org_id, client_id)
    orders = await _orders_in_month(db, org_id, month, c.id)
    days: dict[date, dict[str, int | Decimal]] = {}
    for o in orders:
        d = days.setdefault(
            o.date,
            {
                "lunch_veg": 0,
                "lunch_nonveg": 0,
                "dinner_veg": 0,
                "dinner_nonveg": 0,
                "amount": ZERO,
            },
        )
        d[f"{o.meal_type.value}_veg"] = o.veg_count
        d[f"{o.meal_type.value}_nonveg"] = o.nonveg_count
        d["amount"] = d["amount"] + _amount(o)  # type: ignore[operator]
    payments = await _payments(db, org_id, month, c.id)
    veg = sum(o.veg_count for o in orders)
    nonveg = sum(o.nonveg_count for o in orders)
    amount = sum((_amount(o) for o in orders), ZERO)
    paid = sum((p.amount for p in payments), ZERO)
    return Statement(
        client=TiffinClientOut.model_validate(c),
        month=month_start(month),
        days=[StatementDay(date=k, **v) for k, v in sorted(days.items())],  # type: ignore[arg-type]
        totals=CountTotals(veg=veg, nonveg=nonveg, total=veg + nonveg),
        amount=amount,
        paid=paid,
        due=amount - paid,
        payments=[TiffinPaymentOut.model_validate(p) for p in payments],
    )


async def record_payment(
    db: AsyncSession,
    org_id: int,
    client_id: int,
    month: date,
    data: TiffinPaymentCreate,
    user_id: int,
) -> Statement:
    c = await get_client(db, org_id, client_id)
    db.add(
        TiffinPayment(
            organization_id=org_id,
            client_id=c.id,
            month=month_start(month),
            amount=data.amount,
            method=data.method,
            paid_on=data.paid_on,
            note=data.note,
            recorded_by=user_id,
        )
    )
    await db.flush()
    return await statement(db, org_id, c.id, month)


async def delete_payment(db: AsyncSession, org_id: int, payment_id: int) -> Statement:
    p = await db.get(TiffinPayment, payment_id)
    if p is None or p.organization_id != org_id:
        raise ApiError(404, "PAYMENT_NOT_FOUND", "Payment not found")
    client_id, month = p.client_id, p.month
    await db.delete(p)
    await db.flush()
    return await statement(db, org_id, client_id, month)


async def summary(db: AsyncSession, org_id: int, month: date) -> TiffinSummary:
    orders = await _orders_in_month(db, org_id, month)
    payments = await _payments(db, org_id, month)
    agg: dict[int, dict[str, int | Decimal]] = defaultdict(
        lambda: {"veg": 0, "nonveg": 0, "amount": ZERO, "paid": ZERO}
    )
    for o in orders:
        a = agg[o.client_id]
        a["veg"] += o.veg_count  # type: ignore[operator]
        a["nonveg"] += o.nonveg_count  # type: ignore[operator]
        a["amount"] += _amount(o)  # type: ignore[operator]
    for p in payments:
        agg[p.client_id]["paid"] += p.amount  # type: ignore[operator]
    rows: list[SummaryRow] = []
    for c in await list_clients(db, org_id):
        a = agg.get(c.id)
        if a is None and not c.is_active:
            continue
        a = a or {"veg": 0, "nonveg": 0, "amount": ZERO, "paid": ZERO}
        rows.append(
            SummaryRow(
                client=TiffinClientOut.model_validate(c),
                veg=int(a["veg"]),
                nonveg=int(a["nonveg"]),
                total=int(a["veg"]) + int(a["nonveg"]),
                amount=a["amount"],  # type: ignore[arg-type]
                paid=a["paid"],  # type: ignore[arg-type]
                due=a["amount"] - a["paid"],  # type: ignore[operator]
            )
        )
    t_amount = sum((r.amount for r in rows), ZERO)
    t_paid = sum((r.paid for r in rows), ZERO)
    return TiffinSummary(
        month=month_start(month),
        totals=SummaryTotals(
            veg=sum(r.veg for r in rows),
            nonveg=sum(r.nonveg for r in rows),
            total=sum(r.total for r in rows),
            amount=t_amount,
            paid=t_paid,
            due=t_amount - t_paid,
        ),
        items=rows,
    )


async def bulk_today(db: AsyncSession, org_id: int, d: date) -> BulkToday:
    rows = await db.execute(
        select(
            TiffinOrder.meal_type,
            func.coalesce(func.sum(TiffinOrder.veg_count), 0),
            func.coalesce(func.sum(TiffinOrder.nonveg_count), 0),
        )
        .where(TiffinOrder.organization_id == org_id, TiffinOrder.date == d)
        .group_by(TiffinOrder.meal_type)
    )
    veg = nonveg = lunch = dinner = 0
    for meal, v, n in rows:
        veg += int(v)
        nonveg += int(n)
        if meal is MealType.lunch:
            lunch = int(v) + int(n)
        else:
            dinner = int(v) + int(n)
    return BulkToday(veg=veg, nonveg=nonveg, total=veg + nonveg, lunch=lunch, dinner=dinner)
