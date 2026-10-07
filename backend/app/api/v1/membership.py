from fastapi import APIRouter
from pydantic import BaseModel

from app.core.deps import CustomerUser, DbSession, OwnerUser
from app.core.errors import ApiError
from app.schemas.billing import BillOut, DueRow
from app.schemas.member import MemberOut, RenewalRequest, RenewIn
from app.schemas.plan import PlanOut
from app.services import billing, membership
from app.services.members import member_for_user

router = APIRouter(tags=["membership"])


class RenewOut(BaseModel):
    member: MemberOut
    bill: BillOut


@router.post("/members/{member_id}/renew", response_model=RenewOut)
async def renew(member_id: int, data: RenewIn, owner: OwnerUser, db: DbSession) -> RenewOut:
    m, bill = await membership.renew(
        db, owner.organization_id, member_id, data.plan_id, data.start_date
    )
    out = RenewOut(member=MemberOut.model_validate(m), bill=billing.to_out(bill, m))
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
