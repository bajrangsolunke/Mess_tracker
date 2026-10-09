from datetime import date

from fastapi import APIRouter, Query, Response, status

from app.core.deps import CurrentUser, DbSession, OwnerUser
from app.core.errors import ApiError
from app.core.time import parse_month, today_ist
from app.models import UserRole
from app.schemas.operations import (
    LedgerCreate,
    LedgerEntryOut,
    LedgerReport,
    StaffCreate,
    StaffCreated,
    StaffOut,
    StaffSelf,
    StaffUpdate,
)
from app.services import operations as svc

router = APIRouter(tags=["operations"])


def _month(value: str | None):
    try:
        return parse_month(value) if value else today_ist().replace(day=1)
    except ValueError as e:
        raise ApiError(422, "VALIDATION_ERROR", "month must be YYYY-MM") from e


@router.get("/staff", response_model=list[StaffOut])
async def list_staff(owner: OwnerUser, db: DbSession, month: str | None = None) -> list[StaffOut]:
    return await svc.list_staff(db, owner.organization_id, _month(month))


# declared before /staff/{staff_id} so "me" is not parsed as an id
@router.get("/staff/me", response_model=StaffSelf)
async def staff_me(user: CurrentUser, db: DbSession, month: str | None = None) -> StaffSelf:
    if user.role is not UserRole.staff:
        raise ApiError(403, "FORBIDDEN", "Staff access required")
    return await svc.staff_self(db, user, _month(month))


@router.post("/staff", response_model=StaffCreated, status_code=status.HTTP_201_CREATED)
async def create_staff(data: StaffCreate, owner: OwnerUser, db: DbSession) -> StaffCreated:
    language = await svc.default_language(db, owner.organization_id)
    staff, temp_password = await svc.create_staff(db, owner.organization_id, language, data)
    await db.commit()
    return StaffCreated(staff=staff, temp_password=temp_password)


@router.patch("/staff/{staff_id}", response_model=StaffOut)
async def update_staff(
    staff_id: int, data: StaffUpdate, owner: OwnerUser, db: DbSession
) -> StaffOut:
    staff = await svc.update_staff(db, owner.organization_id, staff_id, data)
    await db.commit()
    return staff


@router.get("/ledger", response_model=LedgerReport)
async def get_ledger(
    owner: OwnerUser,
    db: DbSession,
    from_: date = Query(alias="from"),
    to: date = Query(default_factory=today_ist),
) -> LedgerReport:
    return await svc.ledger_report(db, owner.organization_id, from_, to)


@router.post(
    "/ledger/entries",
    response_model=LedgerEntryOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_ledger_entry(
    data: LedgerCreate, owner: OwnerUser, db: DbSession
) -> LedgerEntryOut:
    entry = await svc.create_ledger_entry(db, owner.organization_id, owner.id, data)
    await db.commit()
    return entry


@router.delete("/ledger/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ledger_entry(entry_id: int, owner: OwnerUser, db: DbSession) -> Response:
    await svc.delete_ledger_entry(db, owner.organization_id, entry_id)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
