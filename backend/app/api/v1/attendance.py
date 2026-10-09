from datetime import date

from fastapi import APIRouter, Query, Response, status

from app.core.deps import AttendanceOperator, CurrentUser, DbSession, OwnerUser
from app.core.errors import ApiError
from app.core.time import parse_month, today_ist
from app.models import AttendanceStatus, Holiday, MealType, UserRole
from app.schemas.attendance import (
    AttendanceSheet,
    BulkMark,
    HistoryOut,
    HolidayCreate,
    HolidayOut,
    MonthState,
    SummaryRow,
)
from app.services import attendance as svc
from app.services.attendance import ensure_closed
from app.services.members import get_member, member_for_user

router = APIRouter(tags=["attendance"])


def _month(value: str | None) -> date:
    try:
        return parse_month(value) if value else today_ist().replace(day=1)
    except ValueError as e:
        raise ApiError(422, "VALIDATION_ERROR", "month must be YYYY-MM") from e


@router.get("/attendance", response_model=AttendanceSheet)
async def get_sheet(
    operator: AttendanceOperator,
    db: DbSession,
    date_: date = Query(alias="date"),
    meal_type: MealType = Query(),
) -> AttendanceSheet:
    await ensure_closed(db, operator.organization_id)
    return await svc.sheet(db, operator.organization_id, date_, meal_type)


@router.put("/attendance", response_model=AttendanceSheet)
async def put_marks(data: BulkMark, operator: AttendanceOperator, db: DbSession) -> AttendanceSheet:
    await svc.bulk_mark(
        db,
        operator.organization_id,
        data.date,
        data.meal_type,
        [(i.member_id, i.status) for i in data.items],
        operator.id,
    )
    await db.commit()
    return await svc.sheet(db, operator.organization_id, data.date, data.meal_type)


@router.post("/attendance/mark-all", response_model=AttendanceSheet)
async def mark_all(
    operator: AttendanceOperator,
    db: DbSession,
    date_: date = Query(alias="date"),
    meal_type: MealType = Query(),
    status_: AttendanceStatus = Query(alias="status"),
) -> AttendanceSheet:
    await svc.mark_all(db, operator.organization_id, date_, meal_type, status_, operator.id)
    await db.commit()
    return await svc.sheet(db, operator.organization_id, date_, meal_type)


@router.get("/attendance/history", response_model=HistoryOut)
async def get_history(
    user: CurrentUser, db: DbSession, member_id: int | None = None, month: str | None = None
) -> HistoryOut:
    await ensure_closed(db, user.organization_id)
    if user.role is UserRole.customer:
        member = await member_for_user(db, user.id)
        if member is None:
            raise ApiError(404, "MEMBER_NOT_FOUND", "No member profile linked to this login")
    else:
        if member_id is None:
            raise ApiError(422, "VALIDATION_ERROR", "member_id is required")
        member = await get_member(db, user.organization_id, member_id)
    return await svc.history(db, user.organization_id, member, _month(month))


@router.get("/attendance/summary", response_model=list[SummaryRow])
async def get_summary(
    owner: OwnerUser, db: DbSession, month: str | None = None
) -> list[SummaryRow]:
    await ensure_closed(db, owner.organization_id)
    return await svc.summary(db, owner.organization_id, _month(month))


# --- holidays -----------------------------------------------------------------


@router.get("/holidays", response_model=list[HolidayOut])
async def list_holidays(
    owner: OwnerUser,
    db: DbSession,
    from_: date = Query(alias="from"),
    to: date = Query(),
) -> list[HolidayOut]:
    return [
        HolidayOut.model_validate(h)
        for h in await svc.list_holidays(db, owner.organization_id, from_, to)
    ]


@router.post("/holidays", response_model=HolidayOut, status_code=status.HTTP_201_CREATED)
async def create_holiday(data: HolidayCreate, owner: OwnerUser, db: DbSession) -> HolidayOut:
    await svc.assert_month_open(db, owner.organization_id, data.date)
    h = Holiday(organization_id=owner.organization_id, **data.model_dump())
    db.add(h)
    await db.commit()
    return HolidayOut.model_validate(h)


@router.delete("/holidays/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_holiday(holiday_id: int, owner: OwnerUser, db: DbSession) -> Response:
    h = await db.get(Holiday, holiday_id)
    if h is None or h.organization_id != owner.organization_id:
        raise ApiError(404, "HOLIDAY_NOT_FOUND", "Holiday not found")
    await db.delete(h)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- months -----------------------------------------------------------------------


@router.get("/months", response_model=list[MonthState])
async def list_months(owner: OwnerUser, db: DbSession, year: int = Query()) -> list[MonthState]:
    closed = await svc.closed_months(db, owner.organization_id, year)
    return [
        MonthState(month=date(year, m, 1), closed=date(year, m, 1) in closed) for m in range(1, 13)
    ]


@router.post("/months/{month}/close", response_model=MonthState)
async def close_month(month: str, owner: OwnerUser, db: DbSession) -> MonthState:
    m = _month(month)
    await svc.close_month(db, owner.organization_id, m, owner.id)
    await db.commit()
    return MonthState(month=m, closed=True)


@router.delete("/months/{month}/close", response_model=MonthState)
async def reopen_month(month: str, owner: OwnerUser, db: DbSession) -> MonthState:
    m = _month(month)
    await svc.reopen_month(db, owner.organization_id, m)
    await db.commit()
    return MonthState(month=m, closed=False)
