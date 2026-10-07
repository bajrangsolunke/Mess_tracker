from datetime import date

from fastapi import APIRouter, Query

from app.core.deps import CustomerUser, DbSession, OwnerUser
from app.core.errors import ApiError
from app.core.time import parse_month, today_ist
from app.schemas.attendance import SummaryRow
from app.schemas.dashboard import CustomerDashboard, MealsReport, OwnerDashboard, PaymentsReport
from app.services import dashboard as svc
from app.services.attendance import summary
from app.services.members import member_for_user

router = APIRouter(tags=["dashboard"])


def _month(value: str | None) -> date:
    try:
        return parse_month(value) if value else today_ist().replace(day=1)
    except ValueError as e:
        raise ApiError(422, "VALIDATION_ERROR", "month must be YYYY-MM") from e


@router.get("/dashboard/owner", response_model=OwnerDashboard)
async def owner_dashboard(
    owner: OwnerUser, db: DbSession, date_: date | None = Query(default=None, alias="date")
) -> OwnerDashboard:
    return await svc.owner_dashboard(db, owner.organization_id, date_ or today_ist())


@router.get("/dashboard/me", response_model=CustomerDashboard)
async def my_dashboard(
    user: CustomerUser, db: DbSession, date_: date | None = Query(default=None, alias="date")
) -> CustomerDashboard:
    member = await member_for_user(db, user.id)
    if member is None:
        raise ApiError(404, "MEMBER_NOT_FOUND", "No member profile linked to this login")
    return await svc.customer_dashboard(
        db, user.organization_id, member, user.id, date_ or today_ist()
    )


@router.get("/reports/meals", response_model=MealsReport)
async def meals_report(owner: OwnerUser, db: DbSession, month: str | None = None) -> MealsReport:
    return await svc.meals_report(db, owner.organization_id, _month(month))


@router.get("/reports/payments", response_model=PaymentsReport)
async def payments_report(
    owner: OwnerUser, db: DbSession, month: str | None = None
) -> PaymentsReport:
    return await svc.payments_report(db, owner.organization_id, _month(month))


@router.get("/reports/attendance", response_model=list[SummaryRow])
async def attendance_report(
    owner: OwnerUser, db: DbSession, month: str | None = None
) -> list[SummaryRow]:
    return await summary(db, owner.organization_id, _month(month))
