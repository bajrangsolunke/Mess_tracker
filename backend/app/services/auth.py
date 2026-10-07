from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import ApiError
from app.core.security import (
    create_access_token,
    hash_password,
    hash_token,
    new_refresh_token,
    verify_password,
)
from app.models import Language, Organization, RefreshToken, User, UserRole
from app.schemas.auth import RegisterOwnerRequest, UpdateMeRequest


async def issue_tokens(db: AsyncSession, user: User) -> tuple[str, str]:
    raw, hashed = new_refresh_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hashed,
            expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_days),
        )
    )
    await db.flush()
    access = create_access_token(user_id=user.id, org_id=user.organization_id, role=user.role.value)
    return access, raw


async def register_owner(db: AsyncSession, data: RegisterOwnerRequest) -> User:
    if data.invite_code != settings.owner_invite_code:
        raise ApiError(403, "INVALID_INVITE", "Invalid invite code")
    existing = (await db.execute(select(User.id).where(User.phone == data.phone))).first()
    if existing:
        raise ApiError(409, "DUPLICATE_PHONE", "A user with this phone already exists")
    org = Organization(name=data.mess_name, default_language=data.language)
    db.add(org)
    await db.flush()
    user = User(
        organization_id=org.id,
        phone=data.phone,
        name=data.owner_name,
        password_hash=hash_password(data.password),
        role=UserRole.owner,
        language=data.language,
    )
    db.add(user)
    try:
        await db.flush()
    except IntegrityError as e:
        raise ApiError(409, "DUPLICATE_PHONE", "A user with this phone already exists") from e
    return user


async def authenticate(db: AsyncSession, phone: str, password: str) -> User:
    user = (await db.execute(select(User).where(User.phone == phone))).scalar_one_or_none()
    if user is None or not user.is_active or not verify_password(password, user.password_hash):
        raise ApiError(401, "INVALID_CREDENTIALS", "Phone or password is incorrect")
    return user


async def rotate_refresh(db: AsyncSession, raw: str) -> User:
    token = (
        await db.execute(select(RefreshToken).where(RefreshToken.token_hash == hash_token(raw)))
    ).scalar_one_or_none()
    now = datetime.now(UTC)
    if token is None or token.revoked_at is not None or token.expires_at < now:
        raise ApiError(401, "INVALID_REFRESH", "Refresh token is invalid or expired")
    token.revoked_at = now
    user = (await db.execute(select(User).where(User.id == token.user_id))).scalar_one_or_none()
    if user is None or not user.is_active:
        raise ApiError(401, "INVALID_REFRESH", "User not found or inactive")
    return user


async def revoke_refresh(db: AsyncSession, raw: str) -> None:
    token = (
        await db.execute(select(RefreshToken).where(RefreshToken.token_hash == hash_token(raw)))
    ).scalar_one_or_none()
    if token is not None and token.revoked_at is None:
        token.revoked_at = datetime.now(UTC)


async def update_me(db: AsyncSession, user: User, data: UpdateMeRequest) -> User:
    if data.name is not None:
        user.name = data.name
    if data.language is not None:
        user.language = Language(data.language)
    if data.new_password is not None:
        if data.current_password is None or not verify_password(
            data.current_password, user.password_hash
        ):
            raise ApiError(400, "WRONG_PASSWORD", "Current password is incorrect")
        user.password_hash = hash_password(data.new_password)
        user.must_change_password = False
    await db.flush()
    return user


async def get_org(db: AsyncSession, org_id: int) -> Organization:
    return (await db.execute(select(Organization).where(Organization.id == org_id))).scalar_one()
