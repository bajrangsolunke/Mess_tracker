from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+asyncpg://mess:mess@localhost:5434/mess"
    jwt_secret: str = "dev-secret-change-me"
    access_token_minutes: int = 15
    refresh_token_days: int = 30
    owner_invite_code: str = "letmein"
    cors_origins: list[str] = ["http://localhost:5173"]
    timezone: str = "Asia/Kolkata"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
