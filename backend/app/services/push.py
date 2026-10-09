"""Web Push: phone notifications for owner/staff (logged in) and members (from their link).

Messages are queued on the DB session and sent only after the transaction commits, in the
background, so a slow push service never slows down marking a meal. Subscriptions the push
service reports as gone (404/410) are removed.
"""

import asyncio
import base64
import json
import logging
from collections.abc import Callable, Iterable
from dataclasses import dataclass

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from pywebpush import WebPushException, webpush
from sqlalchemy import delete, event, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import (
    AppSetting,
    Language,
    Member,
    NotificationType,
    Organization,
    PushSubscription,
    User,
    UserRole,
)
from app.services.notifications import notify

log = logging.getLogger(__name__)

Builder = Callable[[Language], tuple[str, str]]

_keys: tuple[str, str] | None = None
_tasks: set[asyncio.Task] = set()


@dataclass
class Outgoing:
    sub_id: int
    endpoint: str
    p256dh: str
    auth: str
    payload: str


# --- keys --------------------------------------------------------------------------------


def _b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def generate_keys() -> tuple[str, str]:
    """(public application-server key, raw private key), both base64url."""
    key = ec.generate_private_key(ec.SECP256R1())
    public = key.public_key().public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )
    return _b64(public), _b64(key.private_numbers().private_value.to_bytes(32, "big"))


async def vapid_keys(db: AsyncSession) -> tuple[str, str]:
    """Keys from env if set, else created once and kept in app_settings."""
    global _keys
    if settings.vapid_public_key and settings.vapid_private_key:
        return settings.vapid_public_key, settings.vapid_private_key
    if _keys:
        return _keys
    names = ("vapid_public", "vapid_private")

    async def load() -> dict[str, str]:
        rows = await db.execute(
            select(AppSetting.key, AppSetting.value).where(AppSetting.key.in_(names))
        )
        return dict(rows.all())

    found = await load()
    if len(found) < 2:
        public, private = generate_keys()
        await db.execute(
            insert(AppSetting)
            .values(
                [
                    {"key": "vapid_public", "value": public},
                    {"key": "vapid_private", "value": private},
                ]
            )
            .on_conflict_do_nothing(index_elements=["key"])
        )
        await db.flush()
        found = await load()
    _keys = (found["vapid_public"], found["vapid_private"])
    return _keys


# --- subscriptions -----------------------------------------------------------------------


async def subscribe(
    db: AsyncSession,
    org_id: int,
    endpoint: str,
    p256dh: str,
    auth: str,
    user_id: int | None = None,
    member_id: int | None = None,
    user_agent: str | None = None,
) -> None:
    """One row per browser endpoint; re-subscribing moves it to the new owner."""
    stmt = insert(PushSubscription).values(
        organization_id=org_id,
        endpoint=endpoint,
        p256dh=p256dh,
        auth=auth,
        user_id=user_id,
        member_id=member_id,
        user_agent=(user_agent or "")[:300] or None,
    )
    await db.execute(
        stmt.on_conflict_do_update(
            index_elements=["endpoint"],
            set_={
                "organization_id": org_id,
                "p256dh": p256dh,
                "auth": auth,
                "user_id": user_id,
                "member_id": member_id,
            },
        )
    )
    await db.flush()


async def unsubscribe(db: AsyncSession, endpoint: str, **owner) -> None:
    q = delete(PushSubscription).where(PushSubscription.endpoint == endpoint)
    for col, value in owner.items():
        q = q.where(getattr(PushSubscription, col) == value)
    await db.execute(q)
    await db.flush()


# --- sending -----------------------------------------------------------------------------


def _send_webpush(item: Outgoing, private_key: str) -> None:
    webpush(
        subscription_info={
            "endpoint": item.endpoint,
            "keys": {"p256dh": item.p256dh, "auth": item.auth},
        },
        data=item.payload,
        vapid_private_key=private_key,
        vapid_claims={"sub": settings.vapid_subject},
        ttl=24 * 3600,
        timeout=10,
    )


sender: Callable[[Outgoing, str], None] = _send_webpush  # tests replace this


async def _deliver(items: list[Outgoing], private_key: str) -> None:
    gone: list[int] = []
    for it in items:
        try:
            await asyncio.to_thread(sender, it, private_key)
        except WebPushException as e:
            status = e.response.status_code if e.response is not None else None
            if status in (404, 410):
                gone.append(it.sub_id)
            else:
                log.warning("push failed (%s): %s", status, e)
        except Exception:  # never let a push break anything
            log.exception("push failed")
    if gone:
        from app.db.session import SessionLocal

        try:
            async with SessionLocal() as s:
                await s.execute(delete(PushSubscription).where(PushSubscription.id.in_(gone)))
                await s.commit()
        except Exception:
            log.exception("could not remove expired push subscriptions")


def _after_commit(session) -> None:
    items = session.info.pop("push_queue", None)
    if not items or not _keys:
        return
    try:
        task = asyncio.get_running_loop().create_task(_deliver(items, _keys[1]))
    except RuntimeError:
        return
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)


def _after_rollback(session) -> None:
    session.info.pop("push_queue", None)


def _queue(db: AsyncSession) -> list[Outgoing]:
    s = db.sync_session
    if not s.info.get("push_hooked"):
        event.listen(s, "after_commit", _after_commit)
        event.listen(s, "after_soft_rollback", _after_rollback)
        s.info["push_hooked"] = True
    return s.info.setdefault("push_queue", [])


async def drain() -> None:
    """Wait for queued deliveries (tests, shutdown)."""
    while _tasks:
        await asyncio.gather(*list(_tasks), return_exceptions=True)


def _payload(title: str, body: str, url: str, tag: str | None) -> str:
    return json.dumps(
        {"title": title, "body": body, "url": url, "tag": tag, "icon": "/icons/icon-192.png"},
        ensure_ascii=False,
    )


async def send(
    db: AsyncSession,
    org_id: int,
    build: Builder,
    url: str,
    *,
    users: Iterable[User] = (),
    member_ids: Iterable[int] = (),
    tag: str | None = None,
    inbox: NotificationType | None = None,
) -> None:
    """Notify users (push + optional bell inbox) and members (push to their link phones).
    Texts are built per recipient language."""
    users = list(users)
    member_ids = list(member_ids)
    if inbox is not None:
        for u in users:
            title, body = build(u.language)
            await notify(db, org_id, u.id, inbox, title[:160], body or None)
    if not settings.push_enabled or not (users or member_ids):
        return
    conds = []
    if users:
        conds.append(PushSubscription.user_id.in_([u.id for u in users]))
    if member_ids:
        conds.append(PushSubscription.member_id.in_(member_ids))
    from sqlalchemy import or_

    subs = (
        (
            await db.execute(
                select(PushSubscription).where(
                    PushSubscription.organization_id == org_id, or_(*conds)
                )
            )
        )
        .scalars()
        .all()
    )
    if not subs:
        return
    await vapid_keys(db)
    lang_of_user = {u.id: u.language for u in users}
    org_lang = None
    queue = _queue(db)
    for sub in subs:
        if sub.user_id is not None:
            lang = lang_of_user.get(sub.user_id, Language.mr)
        else:
            if org_lang is None:
                org = await db.get(Organization, org_id)
                org_lang = org.default_language if org else Language.mr
            lang = org_lang
        title, body = build(lang)
        queue.append(
            Outgoing(sub.id, sub.endpoint, sub.p256dh, sub.auth, _payload(title, body, url, tag))
        )


async def staff_and_owners(
    db: AsyncSession, org_id: int, roles: Iterable[UserRole], exclude: int | None = None
) -> list[User]:
    rows = (
        await db.execute(
            select(User).where(
                User.organization_id == org_id,
                User.role.in_(list(roles)),
                User.is_active.is_(True),
            )
        )
    ).scalars()
    return [u for u in rows if u.id != exclude]


async def member_token(db: AsyncSession, member_id: int) -> str | None:
    return (
        await db.execute(select(Member.share_token).where(Member.id == member_id))
    ).scalar_one_or_none()
