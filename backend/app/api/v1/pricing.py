from fastapi import APIRouter, Query

from app.core.deps import CustomerUser, DbSession, OwnerUser
from app.core.errors import ApiError
from app.core.time import parse_month, today_ist
from app.models import MealType
from app.schemas.attendance import CheckIn, MyToday, Register
from app.schemas.pricing import PricingOut, PricingPut
from app.services import attendance as att
from app.services import checkin
from app.services.attendance import ensure_closed
from app.services.auth import get_org
from app.services.members import member_for_user
from app.services.pricing import get_pricing, set_pricing

router = APIRouter(tags=["pricing"])


@router.get("/pricing", response_model=PricingOut)
async def read_pricing(owner: OwnerUser, db: DbSession) -> PricingOut:
    return await get_pricing(db, await get_org(db, owner.organization_id))


@router.put("/pricing", response_model=PricingOut)
async def write_pricing(data: PricingPut, owner: OwnerUser, db: DbSession) -> PricingOut:
    out = await set_pricing(db, await get_org(db, owner.organization_id), data)
    await db.commit()
    return out


@router.get("/attendance/register", response_model=Register)
async def read_register(owner: OwnerUser, db: DbSession, month: str | None = None) -> Register:
    await ensure_closed(db, owner.organization_id)
    try:
        m = parse_month(month) if month else today_ist().replace(day=1)
    except ValueError as e:
        raise ApiError(422, "VALIDATION_ERROR", "month must be YYYY-MM") from e
    return await att.register(db, owner.organization_id, m)


async def _member(db: DbSession, user: CustomerUser):
    m = await member_for_user(db, user.id)
    if m is None:
        raise ApiError(404, "MEMBER_NOT_FOUND", "No member profile linked to this login")
    return m


@router.get("/me/attendance/today", response_model=MyToday)
async def my_today(user: CustomerUser, db: DbSession) -> MyToday:
    await ensure_closed(db, user.organization_id)
    return await checkin.today_status(db, await _member(db, user), user)


@router.post("/me/attendance", response_model=MyToday)
async def check_in(data: CheckIn, user: CustomerUser, db: DbSession) -> MyToday:
    m = await _member(db, user)
    await checkin.check_in(db, m, user, data.meal_type)
    await db.commit()
    return await checkin.today_status(db, m, user)


@router.delete("/me/attendance", response_model=MyToday)
async def undo_check_in(
    user: CustomerUser, db: DbSession, meal_type: MealType = Query()
) -> MyToday:
    m = await _member(db, user)
    await checkin.undo_check_in(db, m, user, meal_type)
    await db.commit()
    return await checkin.today_status(db, m, user)
