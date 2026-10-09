from fastapi import APIRouter
from pydantic import BaseModel

from app.core.deps import CustomerUser, DbSession, OwnerUser
from app.core.errors import ApiError
from app.core.time import today_ist
from app.schemas.billing import BillOut, DueRow
from app.schemas.member import MemberOut, RenewalRequest, RenewIn
from app.schemas.plan import PlanOut
from app.services import billing, credits, membership
from app.services.members import member_for_user, pay_at_desk

router = APIRouter(tags=["membership"])


class RenewOut(BaseModel):
    member: MemberOut
    bill: BillOut


@router.post("/members/{member_id}/renew", response_model=RenewOut)
async def renew(member_id: int, data: RenewIn, owner: OwnerUser, db: DbSession) -> RenewOut:
    m, bill = await membership.renew(
        db, owner.organization_id, member_id, data.plan_id, data.start_date
    )
    if data.paid_amount > bill.amount:
        raise ApiError(422, "OVERPAYMENT", f"Only {bill.amount:.2f} is due for this period")
    await pay_at_desk(
        db, owner.organization_id, bill.id, data.paid_amount, data.payment_method, owner.id
    )
    bill = await billing.get_bill(db, owner.organization_id, bill.id)
    member_out = MemberOut.model_validate(m)
    member_out.credits = (await credits.credits_on(db, [m.id], today_ist())).get(m.id)
    out = RenewOut(member=member_out, bill=billing.to_out(*bill))
    await db.commit()
    return out


@router.get("/memberships/due", response_model=list[DueRow])
async def due(owner: OwnerUser, db: DbSession) -> list[DueRow]:
    return await membership.due(db, owner.organization_id)


async def _me(db: DbSession, user: CustomerUser):
    m = await member_for_user(db, user.id)
    if m is None:
        raise ApiError(404, "MEMBER_NOT_FOUND", "No member profile linked to this login")
    return m


@router.get("/me/plans", response_model=list[PlanOut])
async def my_plans(user: CustomerUser, db: DbSession) -> list[PlanOut]:
    return [
        PlanOut.model_validate(p) for p in await membership.active_plans(db, user.organization_id)
    ]


@router.post("/me/renewal", response_model=MemberOut)
async def request_renewal(data: RenewalRequest, user: CustomerUser, db: DbSession) -> MemberOut:
    m = await membership.request_renewal(db, await _me(db, user), data.plan_id)
    out = MemberOut.model_validate(m)
    await db.commit()
    return out


@router.delete("/me/renewal", response_model=MemberOut)
async def cancel_renewal(user: CustomerUser, db: DbSession) -> MemberOut:
    m = await membership.cancel_request(db, await _me(db, user))
    out = MemberOut.model_validate(m)
    await db.commit()
    return out
