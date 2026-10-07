from collections import defaultdict
from collections.abc import Sequence
from datetime import date
from decimal import Decimal

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.core.time import month_end, month_start
from app.models import (
    FoodType,
    MealType,
    TiffinClient,
    TiffinItem,
    TiffinOrder,
    TiffinOrderLine,
    TiffinPayment,
)
from app.schemas.tiffin import (
    BulkItem,
    BulkToday,
    CountTotals,
    ItemTotal,
    OrderIn,
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
    TiffinItemCreate,
    TiffinItemOut,
    TiffinItemUpdate,
    TiffinPaymentCreate,
    TiffinPaymentOut,
    TiffinSummary,
)
from app.services.attendance import assert_month_open, is_month_closed

ZERO = Decimal("0.00")


def _is_veg(line: TiffinOrderLine) -> bool:
    return line.item.food_type is FoodType.veg


def _order_amount(o: TiffinOrder) -> Decimal:
    return sum((ln.quantity * ln.unit_price for ln in o.lines), ZERO)


def _order_qty(o: TiffinOrder) -> int:
    return sum(ln.quantity for ln in o.lines)


# --- price list ----------------------------------------------------------------------


async def list_items(db: AsyncSession, org_id: int) -> list[TiffinItem]:
    q = (
        select(TiffinItem)
        .where(TiffinItem.organization_id == org_id)
        .order_by(TiffinItem.is_active.desc(), TiffinItem.sort_order, TiffinItem.id)
    )
    return list((await db.execute(q)).scalars())


async def get_item(db: AsyncSession, org_id: int, item_id: int) -> TiffinItem:
    it = await db.get(TiffinItem, item_id)
    if it is None or it.organization_id != org_id:
        raise ApiError(404, "TIFFIN_ITEM_NOT_FOUND", "Tiffin item not found")
    return it


async def create_item(db: AsyncSession, org_id: int, data: TiffinItemCreate) -> TiffinItem:
    it = TiffinItem(organization_id=org_id, **data.model_dump())
    db.add(it)
    await db.flush()
    return it


async def update_item(
    db: AsyncSession, org_id: int, item_id: int, data: TiffinItemUpdate
) -> TiffinItem:
    it = await get_item(db, org_id, item_id)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(it, k, v)
    await db.flush()
    return it


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


async def _orders(
    db: AsyncSession, org_id: int, start: date, end: date, client_id: int | None = None
) -> Sequence[TiffinOrder]:
    q = select(TiffinOrder).where(
        TiffinOrder.organization_id == org_id, TiffinOrder.date >= start, TiffinOrder.date <= end
    )
    if client_id is not None:
        q = q.where(TiffinOrder.client_id == client_id)
    return (await db.execute(q.order_by(TiffinOrder.date, TiffinOrder.meal_type))).scalars().all()


async def sheet(db: AsyncSession, org_id: int, d: date, meal: MealType) -> OrderSheet:
    orders = {o.client_id: o for o in await _orders(db, org_id, d, d) if o.meal_type is meal}
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
    used_items = {ln.item_id for o in orders.values() for ln in o.lines}
    items = [it for it in await list_items(db, org_id) if it.is_active or it.id in used_items]
    rows: list[OrderRow] = []
    by_item: dict[str, int] = defaultdict(int)
    veg = nonveg = 0
    amount = ZERO
    for c in clients:
        o = orders.get(c.id)
        qty = {str(ln.item_id): ln.quantity for ln in o.lines} if o else {}
        for ln in o.lines if o else []:
            by_item[str(ln.item_id)] += ln.quantity
            if _is_veg(ln):
                veg += ln.quantity
            else:
                nonveg += ln.quantity
        oa = _order_amount(o) if o else ZERO
        amount += oa
        rows.append(
            OrderRow(
                client=TiffinClientOut.model_validate(c),
                quantities=qty,
                note=o.note if o else None,
                total=_order_qty(o) if o else 0,
                amount=oa,
            )
        )
    order_ids = [str(it.id) for it in items]
    return OrderSheet(
        date=d,
        meal_type=meal,
        locked=await is_month_closed(db, org_id, d),
        items=[TiffinItemOut.model_validate(it) for it in items],
        totals=OrderTotals(total=veg + nonveg, veg=veg, nonveg=nonveg, amount=amount),
        by_item={k: by_item[k] for k in order_ids if by_item.get(k)},
        rows=rows,
    )


async def put_orders(
    db: AsyncSession, org_id: int, d: date, meal: MealType, orders: list[OrderIn]
) -> None:
    await assert_month_open(db, org_id, d)
    for oi in orders:
        c = await get_client(db, org_id, oi.client_id)
        wanted: dict[int, int] = {}
        for ln in oi.lines:
            if ln.quantity > 0:
                wanted[ln.item_id] = wanted.get(ln.item_id, 0) + ln.quantity
        items = {iid: await get_item(db, org_id, iid) for iid in wanted}
        existing = (
            await db.execute(
                select(TiffinOrder).where(
                    TiffinOrder.client_id == c.id,
                    TiffinOrder.date == d,
                    TiffinOrder.meal_type == meal,
                )
            )
        ).scalar_one_or_none()
        if not wanted:
            if existing:
                await db.delete(existing)
            continue
        if existing is None:
            existing = TiffinOrder(
                organization_id=org_id, client_id=c.id, date=d, meal_type=meal, lines=[]
            )
            db.add(existing)
        existing.note = oi.note
        current = {ln.item_id: ln for ln in existing.lines}
        for iid, ln in list(current.items()):
            if iid not in wanted:
                existing.lines.remove(ln)
        for iid, q in wanted.items():
            ln = current.get(iid)
            if ln is None:
                existing.lines.append(
                    TiffinOrderLine(item_id=iid, quantity=q, unit_price=items[iid].price)
                )
            elif ln.quantity != q:
                ln.quantity = q
                ln.unit_price = items[iid].price
    await db.flush()


async def copy_day(db: AsyncSession, org_id: int, src: date, dst: date) -> int:
    await assert_month_open(db, org_id, dst)
    rows = await _orders(db, org_id, src, src)
    by_meal: dict[MealType, list[OrderIn]] = defaultdict(list)
    for o in rows:
        by_meal[o.meal_type].append(
            OrderIn(
                client_id=o.client_id,
                note=o.note,
                lines=[{"item_id": ln.item_id, "quantity": ln.quantity} for ln in o.lines],
            )
        )
    for meal, items in by_meal.items():
        await put_orders(db, org_id, dst, meal, items)
    return len(rows)


# --- statements & payments -----------------------------------------------------------


async def _payments(db: AsyncSession, org_id: int, month: date, client_id: int | None = None):
    q = select(TiffinPayment).where(
        TiffinPayment.organization_id == org_id, TiffinPayment.month == month_start(month)
    )
    if client_id is not None:
        q = q.where(TiffinPayment.client_id == client_id)
    return (await db.execute(q.order_by(TiffinPayment.paid_on, TiffinPayment.id))).scalars().all()


def _counts(orders: Sequence[TiffinOrder]) -> CountTotals:
    veg = sum(ln.quantity for o in orders for ln in o.lines if _is_veg(ln))
    total = sum(_order_qty(o) for o in orders)
    return CountTotals(total=total, veg=veg, nonveg=total - veg)


async def statement(db: AsyncSession, org_id: int, client_id: int, month: date) -> Statement:
    c = await get_client(db, org_id, client_id)
    orders = await _orders(db, org_id, month_start(month), month_end(month), c.id)
    days: dict[date, dict] = {}
    items: dict[int, dict] = {}
    for o in orders:
        d = days.setdefault(o.date, {"lunch": 0, "dinner": 0, "amount": ZERO})
        d[o.meal_type.value] += _order_qty(o)
        d["amount"] += _order_amount(o)
        for ln in o.lines:
            it = items.setdefault(
                ln.item_id,
                {"item": ln.item, "quantity": 0, "amount": ZERO},
            )
            it["quantity"] += ln.quantity
            it["amount"] += ln.quantity * ln.unit_price
    payments = await _payments(db, org_id, month, c.id)
    amount = sum((_order_amount(o) for o in orders), ZERO)
    paid = sum((p.amount for p in payments), ZERO)
    by_item = sorted(items.values(), key=lambda v: (v["item"].sort_order, v["item"].id))
    return Statement(
        client=TiffinClientOut.model_validate(c),
        month=month_start(month),
        days=[
            StatementDay(
                date=k,
                lunch=v["lunch"],
                dinner=v["dinner"],
                total=v["lunch"] + v["dinner"],
                amount=v["amount"],
            )
            for k, v in sorted(days.items())
        ],
        by_item=[
            ItemTotal(
                item_id=v["item"].id,
                name=v["item"].name,
                food_type=v["item"].food_type,
                quantity=v["quantity"],
                amount=v["amount"],
            )
            for v in by_item
        ],
        totals=_counts(orders),
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
    orders = await _orders(db, org_id, month_start(month), month_end(month))
    payments = await _payments(db, org_id, month)
    by_client: dict[int, list[TiffinOrder]] = defaultdict(list)
    for o in orders:
        by_client[o.client_id].append(o)
    paid_by: dict[int, Decimal] = defaultdict(lambda: ZERO)
    for p in payments:
        paid_by[p.client_id] += p.amount
    rows: list[SummaryRow] = []
    for c in await list_clients(db, org_id):
        os_ = by_client.get(c.id, [])
        if not os_ and not c.is_active and not paid_by.get(c.id):
            continue
        counts = _counts(os_)
        amount = sum((_order_amount(o) for o in os_), ZERO)
        paid = paid_by.get(c.id, ZERO)
        rows.append(
            SummaryRow(
                client=TiffinClientOut.model_validate(c),
                total=counts.total,
                veg=counts.veg,
                nonveg=counts.nonveg,
                amount=amount,
                paid=paid,
                due=amount - paid,
            )
        )
    t_amount = sum((r.amount for r in rows), ZERO)
    t_paid = sum((r.paid for r in rows), ZERO)
    return TiffinSummary(
        month=month_start(month),
        totals=SummaryTotals(
            total=sum(r.total for r in rows),
            veg=sum(r.veg for r in rows),
            nonveg=sum(r.nonveg for r in rows),
            amount=t_amount,
            paid=t_paid,
            due=t_amount - t_paid,
        ),
        items=rows,
    )


async def bulk_today(db: AsyncSession, org_id: int, d: date) -> BulkToday:
    orders = await _orders(db, org_id, d, d)
    counts = _counts(orders)
    lunch = sum(_order_qty(o) for o in orders if o.meal_type is MealType.lunch)
    per_item: dict[int, list] = {}
    for o in orders:
        for ln in o.lines:
            entry = per_item.setdefault(ln.item_id, [ln.item, 0])
            entry[1] += ln.quantity
    items = sorted(per_item.values(), key=lambda v: (v[0].sort_order, v[0].id))
    return BulkToday(
        veg=counts.veg,
        nonveg=counts.nonveg,
        total=counts.total,
        lunch=lunch,
        dinner=counts.total - lunch,
        items=[BulkItem(name=it.name, food_type=it.food_type, quantity=q) for it, q in items],
    )
