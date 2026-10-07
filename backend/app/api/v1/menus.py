from datetime import date

from fastapi import APIRouter, Query, Response, status

from app.core.deps import CurrentUser, DbSession, OwnerUser
from app.core.errors import ApiError
from app.models import Announcement
from app.schemas.menu import AnnouncementCreate, AnnouncementOut, CopyResult, MenuOut, MenuPut
from app.services import menus as svc

router = APIRouter(tags=["menus"])


@router.get("/menus", response_model=list[MenuOut])
async def list_menus(
    user: CurrentUser, db: DbSession, from_: date = Query(alias="from"), to: date = Query()
) -> list[MenuOut]:
    if (to - from_).days > 62:
        raise ApiError(422, "VALIDATION_ERROR", "Range too large")
    return await svc.list_menus(db, user.organization_id, from_, to)


@router.put("/menus", response_model=MenuOut)
async def put_menu(data: MenuPut, owner: OwnerUser, db: DbSession) -> MenuOut:
    out = await svc.put_menu(db, owner.organization_id, data.date, data.meal_type, data.items)
    await db.commit()
    return out


@router.post("/menus/copy", response_model=CopyResult)
async def copy_menu(
    owner: OwnerUser, db: DbSession, from_: date = Query(alias="from"), to: date = Query()
) -> CopyResult:
    n = await svc.copy_day(db, owner.organization_id, from_, to)
    await db.commit()
    return CopyResult(copied=n)


@router.get("/announcements", response_model=list[AnnouncementOut])
async def list_announcements(user: CurrentUser, db: DbSession) -> list[AnnouncementOut]:
    return [
        AnnouncementOut.model_validate(a)
        for a in await svc.list_announcements(db, user.organization_id)
    ]


@router.post("/announcements", response_model=AnnouncementOut, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    data: AnnouncementCreate, owner: OwnerUser, db: DbSession
) -> AnnouncementOut:
    a = await svc.create_announcement(db, owner.organization_id, owner.id, data.title, data.body)
    await db.commit()
    return AnnouncementOut.model_validate(a)


@router.delete("/announcements/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_announcement(announcement_id: int, owner: OwnerUser, db: DbSession) -> Response:
    a = await db.get(Announcement, announcement_id)
    if a is None or a.organization_id != owner.organization_id:
        raise ApiError(404, "ANNOUNCEMENT_NOT_FOUND", "Announcement not found")
    await db.delete(a)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
