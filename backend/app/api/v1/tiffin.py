from datetime import date

from fastapi import APIRouter, Query, status

from app.core.deps import AttendanceOperator, DbSession, OwnerUser
from app.core.errors import ApiError
from app.core.time import parse_month, today_ist
from app.models import MealType, UserRole
from app.schemas.tiffin import (
    CopyResult,
    DayPut,
    OrderSheet,
    OrdersPut,
    Statement,
    TiffinClientCreate,
    TiffinClientOut,
    TiffinClientUpdate,
    TiffinDay,
    TiffinItemCreate,
    TiffinItemOut,
    TiffinItemUpdate,
    TiffinPaymentCreate,
    TiffinSummary,
)
from app.services import alerts
from app.services import tiffin as svc

router = APIRouter(tags=["tiffin"])


def _month(value: str | None) -> date:
    try:
        return parse_month(value) if value else today_ist().replace(day=1)
    except ValueError as e:
        raise ApiError(422, "VALIDATION_ERROR", "month must be YYYY-MM") from e


@router.get("/tiffin-items", response_model=list[TiffinItemOut])
async def list_items(owner: OwnerUser, db: DbSession) -> list[TiffinItemOut]:
    return [
        TiffinItemOut.model_validate(i) for i in await svc.list_items(db, owner.organization_id)
    ]


@router.post("/tiffin-items", response_model=TiffinItemOut, status_code=status.HTTP_201_CREATED)
async def create_item(data: TiffinItemCreate, owner: OwnerUser, db: DbSession) -> TiffinItemOut:
    it = await svc.create_item(db, owner.organization_id, data)
    await db.commit()
    return TiffinItemOut.model_validate(it)


@router.patch("/tiffin-items/{item_id}", response_model=TiffinItemOut)
async def update_item(
    item_id: int, data: TiffinItemUpdate, owner: OwnerUser, db: DbSession
) -> TiffinItemOut:
    it = await svc.update_item(db, owner.organization_id, item_id, data)
    await db.commit()
    return TiffinItemOut.model_validate(it)


@router.get("/tiffin-clients", response_model=list[TiffinClientOut])
async def list_clients(owner: OwnerUser, db: DbSession) -> list[TiffinClientOut]:
    return [
        TiffinClientOut.model_validate(c) for c in await svc.list_clients(db, owner.organization_id)
    ]


@router.post("/tiffin-clients", response_model=TiffinClientOut, status_code=status.HTTP_201_CREATED)
async def create_client(
    data: TiffinClientCreate, owner: OwnerUser, db: DbSession
) -> TiffinClientOut:
    c = await svc.create_client(db, owner.organization_id, data)
    await db.commit()
    return TiffinClientOut.model_validate(c)


# declared before /{client_id} routes so "summary" is not parsed as an id
@router.get("/tiffin-clients/summary", response_model=TiffinSummary)
async def clients_summary(
    owner: OwnerUser, db: DbSession, month: str | None = None
) -> TiffinSummary:
    return await svc.summary(db, owner.organization_id, _month(month))


@router.patch("/tiffin-clients/{client_id}", response_model=TiffinClientOut)
async def update_client(
    client_id: int, data: TiffinClientUpdate, owner: OwnerUser, db: DbSession
) -> TiffinClientOut:
    c = await svc.update_client(db, owner.organization_id, client_id, data)
    await db.commit()
    return TiffinClientOut.model_validate(c)


@router.get("/tiffin-clients/{client_id}/statement", response_model=Statement)
async def client_statement(
    client_id: int, owner: OwnerUser, db: DbSession, month: str | None = None
) -> Statement:
    return await svc.statement(db, owner.organization_id, client_id, _month(month))


@router.post(
    "/tiffin-clients/{client_id}/payments",
    response_model=Statement,
    status_code=status.HTTP_201_CREATED,
)
async def record_payment(
    client_id: int, data: TiffinPaymentCreate, owner: OwnerUser, db: DbSession
) -> Statement:
    out = await svc.record_payment(db, owner.organization_id, client_id, data, owner.id)
    await db.commit()
    return out


@router.delete("/tiffin-payments/{payment_id}", response_model=Statement)
async def delete_payment(payment_id: int, owner: OwnerUser, db: DbSession) -> Statement:
    out = await svc.delete_payment(db, owner.organization_id, payment_id)
    await db.commit()
    return out


@router.get("/tiffin-orders", response_model=OrderSheet)
async def get_orders(
    owner: OwnerUser,
    db: DbSession,
    date_: date = Query(alias="date"),
    meal_type: MealType = Query(),
) -> OrderSheet:
    return await svc.sheet(db, owner.organization_id, date_, meal_type)


@router.put("/tiffin-orders", response_model=OrderSheet)
async def put_orders(data: OrdersPut, owner: OwnerUser, db: DbSession) -> OrderSheet:
    await svc.put_orders(db, owner.organization_id, data.date, data.meal_type, data.items)
    await db.commit()
    return await svc.sheet(db, owner.organization_id, data.date, data.meal_type)


@router.post("/tiffin-orders/copy", response_model=CopyResult)
async def copy_orders(
    owner: OwnerUser, db: DbSession, from_: date = Query(alias="from"), to: date = Query()
) -> CopyResult:
    n = await svc.copy_day(db, owner.organization_id, from_, to)
    await db.commit()
    return CopyResult(copied=n)


# Simple daily entry: veg / non-veg counts per company. Staff may enter today's counts
# but never see rates or amounts.


@router.get("/tiffin-day", response_model=TiffinDay)
async def get_day(
    operator: AttendanceOperator, db: DbSession, date_: date = Query(alias="date")
) -> TiffinDay:
    owner = operator.role is UserRole.owner
    return await svc.day_sheet(db, operator.organization_id, date_, show_money=owner)


@router.put("/tiffin-day", response_model=TiffinDay)
async def put_day(data: DayPut, operator: AttendanceOperator, db: DbSession) -> TiffinDay:
    owner = operator.role is UserRole.owner
    if not owner and data.date != today_ist():
        raise ApiError(403, "STAFF_TODAY_ONLY", "Staff can enter today's tiffins only")
    changed = await svc.put_day(db, operator.organization_id, data.date, data.entries)
    await alerts.tiffins_entered(db, operator.organization_id, operator, data.date, changed)
    await db.commit()
    return await svc.day_sheet(db, operator.organization_id, data.date, show_money=owner)
