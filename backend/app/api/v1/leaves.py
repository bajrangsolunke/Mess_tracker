from datetime import date

from fastapi import APIRouter, Query, Response, status

from app.core.deps import CurrentUser, CustomerUser, DbSession, OwnerUser
from app.core.errors import ApiError
from app.models import LeaveStatus
from app.schemas.attendance import MemberBrief
from app.schemas.leave import (
    LeaveCreate,
    LeaveOut,
    LeaveWithMember,
    NotificationOut,
    NotificationPage,
)
from app.services import leaves as svc
from app.services import notifications as notif
from app.services.auth import get_org
from app.services.members import member_for_user

router = APIRouter(tags=["leaves"])


async def _my_member(db: DbSession, user: CustomerUser):
    m = await member_for_user(db, user.id)
    if m is None:
        raise ApiError(404, "MEMBER_NOT_FOUND", "No member profile linked to this login")
    return m


@router.post("/me/leaves", response_model=list[LeaveOut], status_code=status.HTTP_201_CREATED)
async def create_my_leave(data: LeaveCreate, user: CustomerUser, db: DbSession) -> list[LeaveOut]:
    member = await _my_member(db, user)
    org = await get_org(db, user.organization_id)
    rows = await svc.create_leaves(db, org, member, data.date, data.meal_types, data.reason)
    await db.commit()
    return [LeaveOut.model_validate(r) for r in rows]


@router.get("/me/leaves", response_model=list[LeaveOut])
async def list_my_leaves(
    user: CustomerUser, db: DbSession, from_: date = Query(alias="from"), to: date = Query()
) -> list[LeaveOut]:
    member = await _my_member(db, user)
    return [LeaveOut.model_validate(r) for r in await svc.my_leaves(db, member.id, from_, to)]


@router.delete("/me/leaves/{leave_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_my_leave(leave_id: int, user: CustomerUser, db: DbSession) -> Response:
    member = await _my_member(db, user)
    await svc.cancel_leave(db, member.id, leave_id)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/leaves", response_model=list[LeaveWithMember])
async def list_leaves(
    owner: OwnerUser,
    db: DbSession,
    from_: date = Query(alias="from"),
    to: date = Query(),
    status_: LeaveStatus | None = Query(default=None, alias="status"),
) -> list[LeaveWithMember]:
    rows = await svc.list_leaves(db, owner.organization_id, from_, to, status_)
    return [
        LeaveWithMember(
            **LeaveOut.model_validate(lv).model_dump(), member=MemberBrief.model_validate(m)
        )
        for lv, m in rows
    ]


@router.post("/leaves/{leave_id}/approve", response_model=LeaveWithMember)
async def approve(leave_id: int, owner: OwnerUser, db: DbSession) -> LeaveWithMember:
    lv, m = await svc.decide(db, owner.organization_id, leave_id, True, owner.id)
    await db.commit()
    return LeaveWithMember(
        **LeaveOut.model_validate(lv).model_dump(), member=MemberBrief.model_validate(m)
    )


@router.post("/leaves/{leave_id}/reject", response_model=LeaveWithMember)
async def reject(leave_id: int, owner: OwnerUser, db: DbSession) -> LeaveWithMember:
    lv, m = await svc.decide(db, owner.organization_id, leave_id, False, owner.id)
    await db.commit()
    return LeaveWithMember(
        **LeaveOut.model_validate(lv).model_dump(), member=MemberBrief.model_validate(m)
    )


# --- notifications (both roles) -------------------------------------------------


@router.get("/notifications", response_model=NotificationPage)
async def list_notifications(user: CurrentUser, db: DbSession) -> NotificationPage:
    rows, unread = await notif.list_for_user(db, user.id)
    return NotificationPage(items=[NotificationOut.model_validate(n) for n in rows], unread=unread)


@router.post("/notifications/read-all", response_model=NotificationPage)
async def read_all(user: CurrentUser, db: DbSession) -> NotificationPage:
    await notif.mark_read(db, user.id, None)
    await db.commit()
    rows, unread = await notif.list_for_user(db, user.id)
    return NotificationPage(items=[NotificationOut.model_validate(n) for n in rows], unread=unread)


@router.post("/notifications/{notification_id}/read", response_model=NotificationPage)
async def read_one(notification_id: int, user: CurrentUser, db: DbSession) -> NotificationPage:
    await notif.mark_read(db, user.id, notification_id)
    await db.commit()
    rows, unread = await notif.list_for_user(db, user.id)
    return NotificationPage(items=[NotificationOut.model_validate(n) for n in rows], unread=unread)
