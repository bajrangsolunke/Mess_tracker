from pydantic import BaseModel, Field

from app.schemas.common import Money, MoneyIn
from app.schemas.plan import PlanOut


class StandardPlans(BaseModel):
    one_lunch: PlanOut | None
    one_dinner: PlanOut | None
    two: PlanOut | None


class PricingOut(BaseModel):
    one_meal_price: Money | None
    two_meal_price: Money | None
    plans: StandardPlans
    updated_members: int = 0


class PricingPut(BaseModel):
    one_meal_price: MoneyIn = Field(gt=0)
    two_meal_price: MoneyIn = Field(gt=0)
    apply_to_existing: bool = False
