from datetime import date

from fastapi import APIRouter, Query, status

from app.core.deps import DbSession, OwnerUser
from app.core.time import today_ist
from app.schemas.operations import (
    LedgerCreate,
    LedgerEntryOut,
    LedgerReport,
    StaffCreate,
    StaffCreated,
    StaffOut,
    StaffUpdate,
)
from app.services import operations as svc

router = APIRouter(tags=["operations"])


@router.get("/staff", response_model=list[StaffOut])
async def list_staff(owner: OwnerUser, db: DbSession) -> list[StaffOut]:
    return await svc.list_staff(db, owner.organization_id)


@router.post("/staff", response_model=StaffCreated, status_code=status.HTTP_201_CREATED)
async def create_staff(
    data: StaffCreate, owner: OwnerUser, db: DbSession
) -> StaffCreated:
    language = await svc.default_language(db, owner.organization_id)
    staff, temp_password = await svc.create_staff(
        db, owner.organization_id, language, data
    )
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
