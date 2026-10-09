from fastapi import APIRouter, Query, status

from app.core.deps import DbSession, OwnerUser
from app.core.time import today_ist
from app.models import MemberStatus, MemberType
from app.schemas.common import Page
from app.schemas.member import MemberCreate, MemberCreated, MemberOut, MemberUpdate, TempPassword
from app.services import alerts, credits
from app.services import auth as auth_svc
from app.services import members as svc

router = APIRouter(prefix="/members", tags=["members"])


async def _out(db: DbSession, members: list) -> list[MemberOut]:
    ids = [m.id for m in members]
    due = await svc.dues(db, members[0].organization_id, ids) if members else {}
    packs = await credits.credits_on(db, ids, today_ist())
    outs = []
    for m in members:
        o = MemberOut.model_validate(m)
        o.due = due.get(m.id, o.due)
        o.credits = packs.get(m.id)
        outs.append(o)
    return outs


async def _one(db: DbSession, m) -> MemberOut:
    return (await _out(db, [m]))[0]


@router.get("", response_model=Page[MemberOut])
async def list_members(
    owner: OwnerUser,
    db: DbSession,
    search: str | None = Query(default=None, max_length=60),
    status_: MemberStatus | None = Query(default=None, alias="status"),
    plan_id: int | None = None,
    member_type: MemberType | None = None,
    limit: int = Query(default=200, le=500),
    offset: int = Query(default=0, ge=0),
) -> Page[MemberOut]:
    rows, total = await svc.list_members(
        db,
        owner.organization_id,
        search=search,
        status=status_,
        plan_id=plan_id,
        member_type=member_type,
        limit=limit,
        offset=offset,
    )
    return Page(items=await _out(db, list(rows)), total=total)


@router.post("", response_model=MemberCreated, status_code=status.HTTP_201_CREATED)
async def create_member(data: MemberCreate, owner: OwnerUser, db: DbSession) -> MemberCreated:
    org = await auth_svc.get_org(db, owner.organization_id)
    member, temp = await svc.create_member(
        db, owner.organization_id, org.default_language, data, owner.id
    )
    out = await _one(db, member)
    await alerts.member_added(db, owner.organization_id, member, owner.id)
    await db.commit()
    return MemberCreated(member=out, temp_password=temp)


@router.get("/{member_id}", response_model=MemberOut)
async def get_member(member_id: int, owner: OwnerUser, db: DbSession) -> MemberOut:
    return await _one(db, await svc.get_member(db, owner.organization_id, member_id))


@router.patch("/{member_id}", response_model=MemberOut)
async def update_member(
    member_id: int, data: MemberUpdate, owner: OwnerUser, db: DbSession
) -> MemberOut:
    m = await svc.update_member(db, owner.organization_id, member_id, data)
    out = await _one(db, m)
    await db.commit()
    return out


@router.post("/{member_id}/deactivate", response_model=MemberOut)
async def deactivate(member_id: int, owner: OwnerUser, db: DbSession) -> MemberOut:
    m = await svc.set_member_status(db, owner.organization_id, member_id, active=False)
    out = await _one(db, m)
    await db.commit()
    return out


@router.post("/{member_id}/activate", response_model=MemberOut)
async def activate(member_id: int, owner: OwnerUser, db: DbSession) -> MemberOut:
    m = await svc.set_member_status(db, owner.organization_id, member_id, active=True)
    out = await _one(db, m)
    await db.commit()
    return out


@router.post("/{member_id}/reset-password", response_model=TempPassword)
async def reset_password(member_id: int, owner: OwnerUser, db: DbSession) -> TempPassword:
    temp = await svc.reset_member_password(db, owner.organization_id, member_id)
    await db.commit()
    return TempPassword(temp_password=temp)


@router.post("/{member_id}/share-link", response_model=MemberOut)
async def rotate_share_link(member_id: int, owner: OwnerUser, db: DbSession) -> MemberOut:
    """New tracking link; the old one stops working (e.g. sent to a wrong number)."""
    m = await svc.rotate_share_token(db, owner.organization_id, member_id)
    out = await _one(db, m)
    await db.commit()
    return out
