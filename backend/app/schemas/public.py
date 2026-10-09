from datetime import date

from pydantic import BaseModel

from app.models.enums import Language, MemberStatus
from app.schemas.attendance import HistoryOut
from app.schemas.billing import BillOut
from app.schemas.common import Money


class PublicMember(BaseModel):
    member_no: int
    name: str
    plan_name: str
    includes_lunch: bool
    includes_dinner: bool
    status: MemberStatus
    joining_date: date
    valid_until: date | None


class PublicView(BaseModel):
    """What a member sees from their WhatsApp link: no login, read-only."""

    mess_name: str
    language: Language  # the mess's language, used until the member picks one
    member: PublicMember
    days_left: int | None
    history: HistoryOut
    bills: list[BillOut]
    due: Money
