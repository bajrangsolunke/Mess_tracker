from datetime import time

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.phone import normalize_phone
from app.models.enums import Language, UserRole


def _phone_validator(v: str) -> str:
    try:
        return normalize_phone(v)
    except ValueError as e:
        raise ValueError(str(e)) from e


class RegisterOwnerRequest(BaseModel):
    mess_name: str = Field(min_length=2, max_length=120)
    owner_name: str = Field(min_length=1, max_length=120)
    phone: str
    password: str = Field(min_length=6, max_length=128)
    language: Language = Language.en
    invite_code: str

    _norm = field_validator("phone")(_phone_validator)


class LoginRequest(BaseModel):
    phone: str
    password: str

    _norm = field_validator("phone")(_phone_validator)


class RefreshRequest(BaseModel):
    refresh_token: str


class UpdateMeRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    language: Language | None = None
    current_password: str | None = None
    new_password: str | None = Field(default=None, min_length=6, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    phone: str
    email: str | None
    role: UserRole
    language: Language
    must_change_password: bool


class OrganizationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    default_language: Language
    leave_cutoff_time: time
    timezone: str


class MeResponse(BaseModel):
    user: UserOut
    organization: OrganizationOut
    member: dict | None = None  # populated in Phase 2 when members exist


class TokenResponse(MeResponse):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
