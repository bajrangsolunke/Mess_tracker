from fastapi import APIRouter, Response, status

from app.core.deps import CurrentUser, DbSession
from app.models import User
from app.schemas.auth import (
    LoginRequest,
    MeResponse,
    OrganizationOut,
    RefreshRequest,
    RegisterOwnerRequest,
    TokenResponse,
    UpdateMeRequest,
    UserOut,
)
from app.services import auth as svc

router = APIRouter(prefix="/auth", tags=["auth"])


async def _token_response(db: DbSession, user: User) -> TokenResponse:
    access, refresh = await svc.issue_tokens(db, user)
    org = await svc.get_org(db, user.organization_id)
    await db.commit()
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        user=UserOut.model_validate(user),
        organization=OrganizationOut.model_validate(org),
    )


@router.post("/register-owner", status_code=status.HTTP_201_CREATED, response_model=TokenResponse)
async def register_owner(data: RegisterOwnerRequest, db: DbSession) -> TokenResponse:
    user = await svc.register_owner(db, data)
    return await _token_response(db, user)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: DbSession) -> TokenResponse:
    user = await svc.authenticate(db, data.phone, data.password)
    return await _token_response(db, user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, db: DbSession) -> TokenResponse:
    user = await svc.rotate_refresh(db, data.refresh_token)
    return await _token_response(db, user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(data: RefreshRequest, db: DbSession, _: CurrentUser) -> Response:
    await svc.revoke_refresh(db, data.refresh_token)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=MeResponse)
async def me(user: CurrentUser, db: DbSession) -> MeResponse:
    org = await svc.get_org(db, user.organization_id)
    return MeResponse(
        user=UserOut.model_validate(user), organization=OrganizationOut.model_validate(org)
    )


@router.patch("/me", response_model=MeResponse)
async def patch_me(data: UpdateMeRequest, user: CurrentUser, db: DbSession) -> MeResponse:
    user = await svc.update_me(db, user, data)
    org = await svc.get_org(db, user.organization_id)
    await db.commit()
    return MeResponse(
        user=UserOut.model_validate(user), organization=OrganizationOut.model_validate(org)
    )
