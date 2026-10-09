import secrets
from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.core.security import hash_password
from app.models import (
    LedgerEntry,
    LedgerKind,
    Organization,
    StaffProfile,
    User,
    UserRole,
)
from app.schemas.operations import (
    LedgerCreate,
    LedgerEntryOut,
    LedgerReport,
    LedgerTotals,
    StaffCreate,
    StaffOut,
    StaffUpdate,
)

STAFF_LEDGER_KINDS = {
    LedgerKind.staff_advance,
    LedgerKind.salary_payment,
    LedgerKind.advance_repayment,
}


def _temp_password() -> str:
    return f"{secrets.randbelow(10**6):06d}"


def _staff_out(profile: StaffProfile, user: User) -> StaffOut:
    return StaffOut(
        id=profile.id,
        user_id=user.id,
        name=user.name,
        phone=user.phone,
        monthly_salary=profile.monthly_salary,
        is_active=user.is_active,
        created_at=profile.created_at,
    )


async def list_staff(db: AsyncSession, org_id: int) -> list[StaffOut]:
    rows = await db.execute(
        select(StaffProfile, User)
        .join(User, User.id == StaffProfile.user_id)
        .where(StaffProfile.organization_id == org_id, User.role == UserRole.staff)
        .order_by(User.is_active.desc(), User.name)
    )
    return [_staff_out(profile, user) for profile, user in rows]


async def create_staff(
    db: AsyncSession, org_id: int, owner_language, data: StaffCreate
) -> tuple[StaffOut, str]:
    if (
        await db.execute(select(User.id).where(User.phone == data.phone))
    ).first():
        raise ApiError(409, "DUPLICATE_PHONE", "A login with this phone already exists")

    temp_password = _temp_password()
    user = User(
        organization_id=org_id,
        phone=data.phone,
        name=data.name,
        password_hash=hash_password(temp_password),
        role=UserRole.staff,
        language=owner_language,
        must_change_password=True,
    )
    db.add(user)
    try:
        await db.flush()
    except IntegrityError as e:
        raise ApiError(409, "DUPLICATE_PHONE", "A login with this phone already exists") from e

    profile = StaffProfile(
        organization_id=org_id,
        user_id=user.id,
        monthly_salary=data.monthly_salary,
    )
    db.add(profile)
    await db.flush()
    await db.refresh(profile)
    return _staff_out(profile, user), temp_password


async def _get_staff(
    db: AsyncSession, org_id: int, staff_profile_id: int
) -> tuple[StaffProfile, User]:
    row = (
        await db.execute(
            select(StaffProfile, User)
            .join(User, User.id == StaffProfile.user_id)
            .where(
                StaffProfile.id == staff_profile_id,
                StaffProfile.organization_id == org_id,
                User.organization_id == org_id,
                User.role == UserRole.staff,
            )
        )
    ).one_or_none()
    if row is None:
        raise ApiError(404, "STAFF_NOT_FOUND", "Staff member not found")
    return row


async def update_staff(
    db: AsyncSession, org_id: int, staff_profile_id: int, data: StaffUpdate
) -> StaffOut:
    profile, user = await _get_staff(db, org_id, staff_profile_id)
    changes = data.model_dump(exclude_unset=True)
    if "monthly_salary" in changes and changes["monthly_salary"] is not None:
        profile.monthly_salary = changes["monthly_salary"]
    if "is_active" in changes and changes["is_active"] is not None:
        user.is_active = changes["is_active"]
    await db.flush()
    await db.refresh(profile)
    return _staff_out(profile, user)


async def _staff_user(
    db: AsyncSession, org_id: int, user_id: int
) -> User:
    user = (
        await db.execute(
            select(User)
            .join(StaffProfile, StaffProfile.user_id == User.id)
            .where(
                User.id == user_id,
                User.organization_id == org_id,
                User.role == UserRole.staff,
                StaffProfile.organization_id == org_id,
            )
        )
    ).scalar_one_or_none()
    if user is None:
        raise ApiError(422, "STAFF_NOT_FOUND", "Select a staff member from this mess")
    return user


async def create_ledger_entry(
    db: AsyncSession, org_id: int, actor_id: int, data: LedgerCreate
) -> LedgerEntryOut:
    staff = None
    if data.staff_user_id is not None:
        staff = await _staff_user(db, org_id, data.staff_user_id)
    if data.kind in STAFF_LEDGER_KINDS and staff is None:
        raise ApiError(422, "STAFF_REQUIRED", "Select a staff member for this entry")
    entry = LedgerEntry(
        organization_id=org_id,
        kind=data.kind,
        amount=data.amount,
        occurred_on=data.occurred_on,
        description=data.description.strip(),
        note=data.note.strip() if data.note else None,
        staff_user_id=staff.id if staff else None,
        recorded_by=actor_id,
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    return LedgerEntryOut(
        id=entry.id,
        kind=entry.kind,
        amount=entry.amount,
        occurred_on=entry.occurred_on,
        description=entry.description,
        note=entry.note,
        staff_user_id=entry.staff_user_id,
        staff_name=staff.name if staff else None,
        recorded_by=entry.recorded_by,
        created_at=entry.created_at,
    )


async def ledger_report(
    db: AsyncSession, org_id: int, start: date, end: date
) -> LedgerReport:
    if start > end:
        raise ApiError(422, "VALIDATION_ERROR", "from must be on or before to")
    rows = await db.execute(
        select(LedgerEntry, User.name)
        .outerjoin(User, User.id == LedgerEntry.staff_user_id)
        .where(
            LedgerEntry.organization_id == org_id,
            LedgerEntry.occurred_on >= start,
            LedgerEntry.occurred_on <= end,
        )
        .order_by(LedgerEntry.occurred_on.desc(), LedgerEntry.id.desc())
    )
    entries: list[LedgerEntryOut] = []
    totals = {kind: Decimal("0.00") for kind in LedgerKind}
    for entry, staff_name in rows:
        totals[entry.kind] += entry.amount
        entries.append(
            LedgerEntryOut(
                id=entry.id,
                kind=entry.kind,
                amount=entry.amount,
                occurred_on=entry.occurred_on,
                description=entry.description,
                note=entry.note,
                staff_user_id=entry.staff_user_id,
                staff_name=staff_name,
                recorded_by=entry.recorded_by,
                created_at=entry.created_at,
            )
        )
    cash_in = totals[LedgerKind.income] + totals[LedgerKind.advance_repayment]
    cash_out = (
        totals[LedgerKind.expense]
        + totals[LedgerKind.staff_advance]
        + totals[LedgerKind.salary_payment]
    )
    return LedgerReport(
        from_date=start,
        to_date=end,
        entries=entries,
        totals=LedgerTotals(
            income=totals[LedgerKind.income],
            expense=totals[LedgerKind.expense],
            staff_advance=totals[LedgerKind.staff_advance],
            salary_payment=totals[LedgerKind.salary_payment],
            advance_repayment=totals[LedgerKind.advance_repayment],
            cash_in=cash_in,
            cash_out=cash_out,
            net=cash_in - cash_out,
        ),
    )


async def default_language(db: AsyncSession, org_id: int):
    org = await db.get(Organization, org_id)
    if org is None:
        raise ApiError(404, "ORGANIZATION_NOT_FOUND", "Mess not found")
    return org.default_language
