from datetime import date

from fastapi import APIRouter, Path, Response

from app.core.deps import DbSession
from app.core.errors import ApiError
from app.core.time import parse_month, today_ist
from app.schemas.public import PublicMember, PublicView
from app.services import attendance, billing, credits
from app.services import auth as auth_svc
from app.services.members import dues, member_by_token

router = APIRouter(prefix="/public", tags=["public"])


def _month(value: str | None) -> date:
    try:
        return parse_month(value) if value else today_ist().replace(day=1)
    except ValueError as e:
        raise ApiError(422, "VALIDATION_ERROR", "month must be YYYY-MM") from e


@router.get("/members/{token}", response_model=PublicView)
async def member_view(
    response: Response,
    db: DbSession,
    token: str = Path(min_length=16, max_length=32),
    month: str | None = None,
) -> PublicView:
    """Read-only view behind the member's secret link (shared on WhatsApp)."""
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Robots-Tag"] = "noindex"
    m = await member_by_token(db, token)
    await attendance.ensure_closed(db, m.organization_id)
    org = await auth_svc.get_org(db, m.organization_id)
    today = today_ist()
    due = (await dues(db, m.organization_id, [m.id])).get(m.id)
    return PublicView(
        mess_name=org.name,
        language=org.default_language,
        member=PublicMember(
            member_no=m.member_no,
            name=m.name,
            plan_name=m.plan.name,
            includes_lunch=m.plan.includes_lunch,
            includes_dinner=m.plan.includes_dinner,
            status=m.status,
            joining_date=m.joining_date,
            valid_until=m.valid_until,
        ),
        days_left=(m.valid_until - today).days if m.valid_until else None,
        history=await attendance.history(db, m.organization_id, m, _month(month)),
        bills=await billing.my_bills(db, m, limit=6),
        due=due if due is not None else 0,
        credits=(await credits.credits_on(db, [m.id], today)).get(m.id),
    )
