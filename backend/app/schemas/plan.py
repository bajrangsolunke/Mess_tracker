from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.common import Money, MoneyIn


class PlanCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    includes_lunch: bool = True
    includes_dinner: bool = True
    monthly_fee: MoneyIn

    @model_validator(mode="after")
    def _at_least_one_meal(self) -> "PlanCreate":
        if not (self.includes_lunch or self.includes_dinner):
            raise ValueError("plan must include lunch or dinner")
        return self


class PlanUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    includes_lunch: bool | None = None
    includes_dinner: bool | None = None
    monthly_fee: MoneyIn | None = None
    is_active: bool | None = None


class PlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    includes_lunch: bool
    includes_dinner: bool
    monthly_fee: Money
    is_active: bool
    kind: str | None = None
