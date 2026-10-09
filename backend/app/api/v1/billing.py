from datetime import date

from fastapi import APIRouter, Query, status

from app.core.deps import CustomerUser, DbSession, OwnerUser
from app.core.errors import ApiError
from app.core.time import parse_month, today_ist
from app.models import BillStatus
from app.schemas.billing import (
    BillOut,
    BillPage,
    BillUpdate,
    GenerateResult,
    PaymentCreate,
    RemindersResult,
)
from app.services import alerts
from app.services import billing as svc
from app.services.members import get_member, member_for_user

router = APIRouter(tags=["billing"])


def _month(value: str | None) -> date:
    try:
        return parse_month(value) if value else today_ist().replace(day=1)
    except ValueError as e:
        raise ApiError(422, "VALIDATION_ERROR", "month must be YYYY-MM") from e


@router.get("/bills", response_model=BillPage)
async def list_bills(
    owner: OwnerUser,
    db: DbSession,
    month: str | None = None,
    status_: BillStatus | None = Query(default=None, alias="status"),
) -> BillPage:
    return await svc.list_bills(db, owner.organization_id, _month(month), status_)


@router.post("/bills/generate", response_model=GenerateResult)
async def generate(owner: OwnerUser, db: DbSession, month: str | None = None) -> GenerateResult:
    m = _month(month)
    created, total = await svc.generate(db, owner.organization_id, m)
    await db.commit()
    return GenerateResult(month=m, created=created, total=total)


@router.patch("/bills/{bill_id}", response_model=BillOut)
async def update_bill(bill_id: int, data: BillUpdate, owner: OwnerUser, db: DbSession) -> BillOut:
    out = await svc.update_bill(
        db, owner.organization_id, bill_id, data.amount, data.note, "note" in data.model_fields_set
    )
    await db.commit()
    return out


@router.post(
    "/bills/{bill_id}/payments", response_model=BillOut, status_code=status.HTTP_201_CREATED
)
async def record_payment(
    bill_id: int, data: PaymentCreate, owner: OwnerUser, db: DbSession
) -> BillOut:
    out = await svc.record_payment(db, owner.organization_id, bill_id, data, owner.id)
    member = await get_member(db, owner.organization_id, out.member.id)
    await alerts.payment_received(db, owner.organization_id, member, data.amount, out.due)
    await db.commit()
    return out


@router.delete("/payments/{payment_id}", response_model=BillOut)
async def delete_payment(payment_id: int, owner: OwnerUser, db: DbSession) -> BillOut:
    out = await svc.delete_payment(db, owner.organization_id, payment_id)
    await db.commit()
    return out


@router.get("/me/bills", response_model=list[BillOut])
async def my_bills(user: CustomerUser, db: DbSession) -> list[BillOut]:
    member = await member_for_user(db, user.id)
    if member is None:
        raise ApiError(404, "MEMBER_NOT_FOUND", "No member profile linked to this login")
    return await svc.my_bills(db, member)


@router.post("/notifications/payment-reminders", response_model=RemindersResult)
async def payment_reminders(
    owner: OwnerUser, db: DbSession, month: str | None = None
) -> RemindersResult:
    sent = await svc.send_payment_reminders(db, owner.organization_id, _month(month))
    await db.commit()
    return RemindersResult(sent=sent)
