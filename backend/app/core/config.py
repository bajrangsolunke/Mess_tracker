from functools import lru_cache
from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

INSECURE_JWT_SECRET = "dev-secret-change-me"
INSECURE_INVITE_CODE = "letmein"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    env: Literal["development", "test", "production"] = "development"
    database_url: str = "postgresql+asyncpg://mess:mess@localhost:5434/mess"
    jwt_secret: str = INSECURE_JWT_SECRET
    access_token_minutes: int = 15
    refresh_token_days: int = 30
    owner_invite_code: str = INSECURE_INVITE_CODE
    cors_origins: list[str] = ["http://localhost:5173"]
    timezone: str = "Asia/Kolkata"
    # Mark expected members absent once a meal's end time has passed (disabled in most tests).
    auto_close_meals: bool = True

    @field_validator("database_url")
    @classmethod
    def _asyncpg_url(cls, v: str) -> str:
        """Render/Neon hand out postgres:// or postgresql:// URLs; SQLAlchemy needs asyncpg."""
        if v.startswith("postgres://"):
            return "postgresql+asyncpg://" + v[len("postgres://") :]
        if v.startswith("postgresql://"):
            return "postgresql+asyncpg://" + v[len("postgresql://") :]
        return v

    @model_validator(mode="after")
    def _refuse_insecure_production(self) -> "Settings":
        if self.env == "production":
            if self.jwt_secret == INSECURE_JWT_SECRET or len(self.jwt_secret) < 32:
                raise ValueError("JWT_SECRET must be set to at least 32 characters in production")
            if self.owner_invite_code == INSECURE_INVITE_CODE or len(self.owner_invite_code) < 8:
                raise ValueError("OWNER_INVITE_CODE must be set (8+ chars) in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
