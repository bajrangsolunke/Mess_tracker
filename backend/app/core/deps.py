from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.core.security import TokenError, decode_access_token
from app.db.session import get_session
from app.models import User, UserRole

DbSession = Annotated[AsyncSession, Depends(get_session)]


def _bearer(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    scheme, _, token = auth.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise ApiError(401, "NOT_AUTHENTICATED", "Missing bearer token")
    return token


async def get_current_user(request: Request, db: DbSession) -> User:
    try:
        payload = decode_access_token(_bearer(request))
    except TokenError as e:
        raise ApiError(401, "NOT_AUTHENTICATED", "Invalid or expired token") from e
    user = (await db.execute(select(User).where(User.id == payload.sub))).scalar_one_or_none()
    if user is None or not user.is_active:
        raise ApiError(401, "NOT_AUTHENTICATED", "User not found or inactive")
    if user.organization_id != payload.org:
        raise ApiError(401, "NOT_AUTHENTICATED", "Token organization mismatch")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def require_owner(user: CurrentUser) -> User:
    if user.role is not UserRole.owner:
        raise ApiError(403, "FORBIDDEN", "Owner access required")
    return user


async def require_customer(user: CurrentUser) -> User:
    if user.role is not UserRole.customer:
        raise ApiError(403, "FORBIDDEN", "Customer access required")
    return user


OwnerUser = Annotated[User, Depends(require_owner)]
CustomerUser = Annotated[User, Depends(require_customer)]
