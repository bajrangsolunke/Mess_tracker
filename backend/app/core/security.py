import hashlib
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from app.core.config import settings

ALGORITHM = "HS256"


class TokenError(Exception):
    """Raised when an access token is missing, malformed, expired or tampered."""


@dataclass(frozen=True)
class TokenPayload:
    sub: int
    org: int
    role: str
    exp: int


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except ValueError:
        return False


def create_access_token(
    *, user_id: int, org_id: int, role: str, expires_minutes: int | None = None
) -> str:
    minutes = settings.access_token_minutes if expires_minutes is None else expires_minutes
    exp = datetime.now(UTC) + timedelta(minutes=minutes)
    payload = {"sub": str(user_id), "org": org_id, "role": role, "exp": exp}
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def decode_access_token(token: str) -> TokenPayload:
    try:
        data = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
        return TokenPayload(
            sub=int(data["sub"]), org=int(data["org"]), role=str(data["role"]), exp=int(data["exp"])
        )
    except (jwt.PyJWTError, KeyError, ValueError, TypeError) as e:
        raise TokenError(str(e)) from e


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def new_refresh_token() -> tuple[str, str]:
    """Return (raw_token_for_client, sha256_hash_for_storage)."""
    raw = secrets.token_urlsafe(48)
    return raw, hash_token(raw)
