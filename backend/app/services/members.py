import secrets
from datetime import date

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.core.security import hash_password
from app.core.time import today_ist
from app.models import Language, Member, MemberStatus, MemberType, MessPlan, User, UserRole
from app.schemas.member import MemberCreate, MemberUpdate
from app.schemas.plan import PlanCreate, PlanUpdate

# --- plans ----------------------------------------------------------------------


async def list_plans(
    db: AsyncSession, org_id: int, include_inactive: bool = True
) -> list[MessPlan]:
    q = select(MessPlan).where(MessPlan.organization_id == org_id).order_by(MessPlan.id)
    if not include_inactive:
        q = q.where(MessPlan.is_active.is_(True))
    return list((await db.execute(q)).scalars())


async def get_plan(db: AsyncSession, org_id: int, plan_id: int) -> MessPlan:
    plan = (
        await db.execute(
            select(MessPlan).where(MessPlan.id == plan_id, MessPlan.organization_id == org_id)
        )
    ).scalar_one_or_none()
    if plan is None:
        raise ApiError(404, "PLAN_NOT_FOUND", "Plan not found")
    return plan


async def create_plan(db: AsyncSession, org_id: int, data: PlanCreate) -> MessPlan:
    plan = MessPlan(organization_id=org_id, **data.model_dump())
    db.add(plan)
    await db.flush()
    return plan


async def update_plan(db: AsyncSession, org_id: int, plan_id: int, data: PlanUpdate) -> MessPlan:
    plan = await get_plan(db, org_id, plan_id)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(plan, k, v)
    if not (plan.includes_lunch or plan.includes_dinner):
        raise ApiError(422, "VALIDATION_ERROR", "Plan must include lunch or dinner")
    await db.flush()
    return plan


# --- members --------------------------------------------------------------------


def _temp_password() -> str:
    return f"{secrets.randbelow(10**6):06d}"


async def get_member(db: AsyncSession, org_id: int, member_id: int) -> Member:
    m = (
        await db.execute(
            select(Member).where(Member.id == member_id, Member.organization_id == org_id)
        )
    ).scalar_one_or_none()
    if m is None:
        raise ApiError(404, "MEMBER_NOT_FOUND", "Member not found")
    return m


async def member_for_user(db: AsyncSession, user_id: int) -> Member | None:
    return (await db.execute(select(Member).where(Member.user_id == user_id))).scalar_one_or_none()


async def list_members(
    db: AsyncSession,
    org_id: int,
    *,
    search: str | None = None,
    status: MemberStatus | None = None,
    plan_id: int | None = None,
    member_type: MemberType | None = None,
    limit: int = 200,
    offset: int = 0,
) -> tuple[list[Member], int]:
    q = select(Member).where(Member.organization_id == org_id)
    if search:
        like = f"%{search.strip()}%"
        q = q.where(
            or_(
                Member.name.ilike(like),
                Member.phone.ilike(like),
                Member.room_no.ilike(like),
                Member.company.ilike(like),
            )
        )
    if status is not None:
        q = q.where(Member.status == status)
    if plan_id is not None:
        q = q.where(Member.plan_id == plan_id)
    if member_type is not None:
        q = q.where(Member.member_type == member_type)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    rows = (await db.execute(q.order_by(Member.name).limit(limit).offset(offset))).scalars()
    return list(rows), total


async def _phone_taken(db: AsyncSession, phone: str) -> bool:
    return (await db.execute(select(User.id).where(User.phone == phone))).first() is not None


async def create_member(
    db: AsyncSession, org_id: int, org_language: Language, data: MemberCreate
) -> tuple[Member, str | None]:
    plan = await get_plan(db, org_id, data.plan_id)
    if data.create_login and await _phone_taken(db, data.phone):
        raise ApiError(409, "DUPLICATE_PHONE", "A login with this phone already exists")
    temp = None
    user_id = None
    if data.create_login:
        temp = _temp_password()
        user = User(
            organization_id=org_id,
            phone=data.phone,
            name=data.name,
            password_hash=hash_password(temp),
            role=UserRole.customer,
            language=org_language,
            must_change_password=True,
        )
        db.add(user)
        try:
            await db.flush()
        except IntegrityError as e:
            raise ApiError(409, "DUPLICATE_PHONE", "A login with this phone already exists") from e
        user_id = user.id
    member = Member(
        organization_id=org_id,
        user_id=user_id,
        name=data.name,
        phone=data.phone,
        room_no=data.room_no,
        member_type=data.member_type,
        company=data.company,
        delivery_address=data.delivery_address,
        plan_id=plan.id,
        monthly_fee=data.monthly_fee if data.monthly_fee is not None else plan.monthly_fee,
        joining_date=data.joining_date,
        deposit=data.deposit,
        emergency_contact=data.emergency_contact,
        notes=data.notes,
    )
    db.add(member)
    await db.flush()
    await db.refresh(member)
    return member, temp


async def update_member(
    db: AsyncSession, org_id: int, member_id: int, data: MemberUpdate
) -> Member:
    m = await get_member(db, org_id, member_id)
    changes = data.model_dump(exclude_unset=True)
    if "plan_id" in changes:
        await get_plan(db, org_id, changes["plan_id"])
    for k, v in changes.items():
        setattr(m, k, v)
    if m.user_id and "name" in changes:
        user = await db.get(User, m.user_id)
        if user:
            user.name = m.name
    await db.flush()
    await db.refresh(m)
    return m


async def set_member_status(db: AsyncSession, org_id: int, member_id: int, active: bool) -> Member:
    m = await get_member(db, org_id, member_id)
    m.status = MemberStatus.active if active else MemberStatus.inactive
    m.inactive_from = None if active else today_ist()
    if m.user_id:
        user = await db.get(User, m.user_id)
        if user:
            user.is_active = active
    await db.flush()
    await db.refresh(m)
    return m


async def reset_member_password(db: AsyncSession, org_id: int, member_id: int) -> str:
    m = await get_member(db, org_id, member_id)
    if m.user_id is None:
        raise ApiError(409, "NO_LOGIN", "This member has no login yet")
    user = await db.get(User, m.user_id)
    assert user is not None
    temp = _temp_password()
    user.password_hash = hash_password(temp)
    user.must_change_password = True
    await db.flush()
    return temp


def joining_date_or_today(d: date | None) -> date:
    return d or today_ist()
