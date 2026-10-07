from fastapi import APIRouter, status

from app.core.deps import DbSession, OwnerUser
from app.schemas.plan import PlanCreate, PlanOut, PlanUpdate
from app.services import members as svc

router = APIRouter(prefix="/plans", tags=["plans"])


@router.get("", response_model=list[PlanOut])
async def list_plans(owner: OwnerUser, db: DbSession) -> list[PlanOut]:
    return [PlanOut.model_validate(p) for p in await svc.list_plans(db, owner.organization_id)]


@router.post("", response_model=PlanOut, status_code=status.HTTP_201_CREATED)
async def create_plan(data: PlanCreate, owner: OwnerUser, db: DbSession) -> PlanOut:
    plan = await svc.create_plan(db, owner.organization_id, data)
    await db.commit()
    return PlanOut.model_validate(plan)


@router.patch("/{plan_id}", response_model=PlanOut)
async def update_plan(plan_id: int, data: PlanUpdate, owner: OwnerUser, db: DbSession) -> PlanOut:
    plan = await svc.update_plan(db, owner.organization_id, plan_id, data)
    await db.commit()
    return PlanOut.model_validate(plan)
