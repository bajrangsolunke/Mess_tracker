from fastapi import APIRouter, Response, status

from app.core.deps import CurrentUser, DbSession, OwnerUser
from app.models import User
from app.schemas.auth import (
    LoginRequest,
    MeResponse,
    OrganizationOut,
    OrganizationUpdate,
    RefreshRequest,
    RegisterOwnerRequest,
    TokenResponse,
    UpdateMeRequest,
    UserOut,
)
from app.schemas.member import MemberOut
from app.services import auth as svc
from app.services.members import member_for_user

router = APIRouter(prefix="/auth", tags=["auth"])


async def _member_out(db: DbSession, user: User) -> MemberOut | None:
    m = await member_for_user(db, user.id)
    return MemberOut.model_validate(m) if m else None


async def _token_response(db: DbSession, user: User) -> TokenResponse:
    access, refresh = await svc.issue_tokens(db, user)
    org = await svc.get_org(db, user.organization_id)
    member = await _member_out(db, user)
    await db.commit()
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        user=UserOut.model_validate(user),
        organization=OrganizationOut.model_validate(org),
        member=member,
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
async def logout(data: RefreshRequest, db: DbSession) -> Response:
    """Revoke a refresh token. Needs no access token so logout works after access expiry;
    possession of the raw refresh token is the credential."""
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


org_router = APIRouter(prefix="/organization", tags=["organization"])


@org_router.get("", response_model=OrganizationOut)
async def read_org(user: CurrentUser, db: DbSession) -> OrganizationOut:
    return OrganizationOut.model_validate(await svc.get_org(db, user.organization_id))


@org_router.patch("", response_model=OrganizationOut)
async def update_org(data: OrganizationUpdate, owner: OwnerUser, db: DbSession) -> OrganizationOut:
    org = await svc.get_org(db, owner.organization_id)
    for k, v in data.model_dump(exclude_unset=True).items():
        if v is not None:
            setattr(org, k, v)
    await db.commit()
    return OrganizationOut.model_validate(org)
