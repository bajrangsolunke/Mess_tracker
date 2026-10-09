from fastapi import APIRouter, Header, Path, Query, Response, status

from app.core.config import settings
from app.core.deps import CurrentUser, DbSession
from app.core.errors import ApiError
from app.models import Organization
from app.schemas.push import PushKey, PushSubscriptionIn
from app.services import push
from app.services.members import member_by_token
from app.services.push_messages import text

router = APIRouter(tags=["push"])


@router.get("/push/key", response_model=PushKey)
async def public_key(db: DbSession) -> PushKey:
    """The application-server key browsers need to subscribe."""
    public, _ = await push.vapid_keys(db)
    await db.commit()
    return PushKey(public_key=public, enabled=settings.push_enabled)


@router.post("/push/subscriptions", status_code=status.HTTP_204_NO_CONTENT)
async def subscribe_user(
    data: PushSubscriptionIn,
    user: CurrentUser,
    db: DbSession,
    user_agent: str | None = Header(default=None),
) -> Response:
    await push.subscribe(
        db,
        user.organization_id,
        data.endpoint,
        data.keys.p256dh,
        data.keys.auth,
        user_id=user.id,
        user_agent=user_agent,
    )
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/push/subscriptions", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe_user(
    user: CurrentUser, db: DbSession, endpoint: str = Query(max_length=2000)
) -> Response:
    await push.unsubscribe(db, endpoint, user_id=user.id)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/push/test", status_code=status.HTTP_204_NO_CONTENT)
async def test_push(user: CurrentUser, db: DbSession) -> Response:
    org = await db.get(Organization, user.organization_id)
    mess = org.name if org else ""
    await push.send(
        db, user.organization_id, lambda lang: text("test", lang, mess=mess), "/", users=[user]
    )
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Members have no login: their secret link token identifies them.


@router.post("/public/members/{token}/push", status_code=status.HTTP_204_NO_CONTENT)
async def subscribe_member(
    data: PushSubscriptionIn,
    db: DbSession,
    token: str = Path(min_length=16, max_length=32),
    user_agent: str | None = Header(default=None),
) -> Response:
    m = await member_by_token(db, token)
    await push.subscribe(
        db,
        m.organization_id,
        data.endpoint,
        data.keys.p256dh,
        data.keys.auth,
        member_id=m.id,
        user_agent=user_agent,
    )
    org = await db.get(Organization, m.organization_id)
    mess = org.name if org else ""
    await push.send(
        db,
        m.organization_id,
        lambda lang: text("test", lang, mess=mess),
        f"/m/{token}",
        member_ids=[m.id],
    )
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/public/members/{token}/push", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe_member(
    db: DbSession,
    token: str = Path(min_length=16, max_length=32),
    endpoint: str = Query(max_length=2000),
) -> Response:
    try:
        m = await member_by_token(db, token)
    except ApiError:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    await push.unsubscribe(db, endpoint, member_id=m.id)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
