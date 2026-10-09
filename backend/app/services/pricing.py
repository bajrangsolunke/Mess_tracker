"""Monthly mess prices: 1 meal a day and 2 meals a day, backed by three standard plans."""

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Language, Member, MemberStatus, MessPlan, Organization
from app.schemas.plan import PlanOut
from app.schemas.pricing import PricingOut, PricingPut, StandardPlans

# kind -> (includes_lunch, includes_dinner, price field)
KINDS = {
    "one_lunch": (True, False, "one_meal_price"),
    "one_dinner": (False, True, "one_meal_price"),
    "two": (True, True, "two_meal_price"),
}
# tiffins per membership period; a 1-time member may also eat the other meal
CREDITS = {"one_lunch": 30, "one_dinner": 30, "two": 60}
NAMES = {
    Language.mr: {"one_lunch": "1 वेळ (दुपार)", "one_dinner": "1 वेळ (रात्री)", "two": "2 वेळा"},
    Language.hi: {"one_lunch": "1 समय (दोपहर)", "one_dinner": "1 समय (रात)", "two": "2 समय"},
    Language.en: {"one_lunch": "1 meal (Lunch)", "one_dinner": "1 meal (Dinner)", "two": "2 meals"},
}


async def _standard(db: AsyncSession, org_id: int) -> dict[str, MessPlan]:
    rows = (
        await db.execute(
            select(MessPlan).where(MessPlan.organization_id == org_id, MessPlan.kind.is_not(None))
        )
    ).scalars()
    return {p.kind: p for p in rows if p.kind}


async def get_pricing(db: AsyncSession, org: Organization, updated: int = 0) -> PricingOut:
    std = await _standard(db, org.id)
    return PricingOut(
        one_meal_price=org.one_meal_price,
        two_meal_price=org.two_meal_price,
        plans=StandardPlans(
            **{k: PlanOut.model_validate(std[k]) if k in std else None for k in KINDS}
        ),
        updated_members=updated,
    )


async def set_pricing(db: AsyncSession, org: Organization, data: PricingPut) -> PricingOut:
    org.one_meal_price = data.one_meal_price
    org.two_meal_price = data.two_meal_price
    std = await _standard(db, org.id)
    names = NAMES.get(org.default_language, NAMES[Language.en])
    for kind, (lunch, dinner, field) in KINDS.items():
        price = getattr(data, field)
        plan = std.get(kind)
        if plan is None:
            plan = MessPlan(
                organization_id=org.id,
                kind=kind,
                name=names[kind],
                includes_lunch=lunch,
                includes_dinner=dinner,
                monthly_fee=price,
                meal_credits=CREDITS[kind],
            )
            db.add(plan)
            std[kind] = plan
        else:
            plan.monthly_fee = price
            plan.is_active = True
            plan.meal_credits = CREDITS[kind]
    await db.flush()
    updated = 0
    if data.apply_to_existing:
        for plan in std.values():
            res = await db.execute(
                update(Member)
                .where(
                    Member.organization_id == org.id,
                    Member.plan_id == plan.id,
                    Member.status == MemberStatus.active,
                    Member.monthly_fee != plan.monthly_fee,
                )
                .values(monthly_fee=plan.monthly_fee)
            )
            updated += res.rowcount or 0
        await db.flush()
    return await get_pricing(db, org, updated)
