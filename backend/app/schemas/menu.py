from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import MealType


class MenuPut(BaseModel):
    date: date
    meal_type: MealType
    items: list[str] = Field(max_length=30)

    @field_validator("items")
    @classmethod
    def _clean(cls, v: list[str]) -> list[str]:
        out = [x.strip() for x in v if x and x.strip()]
        for x in out:
            if len(x) > 80:
                raise ValueError("menu item too long")
        return out


class MenuOut(BaseModel):
    date: date
    meal_type: MealType
    items: list[str]


class CopyResult(BaseModel):
    copied: int


class AnnouncementCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    body: str | None = Field(default=None, max_length=2000)


class AnnouncementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    body: str | None
    published_at: datetime
