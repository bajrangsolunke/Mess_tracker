import time

import pytest

from app.core.phone import normalize_phone
from app.core.security import (
    TokenError,
    create_access_token,
    decode_access_token,
    hash_password,
    hash_token,
    new_refresh_token,
    verify_password,
)


def test_password_roundtrip():
    h = hash_password("secret123")
    assert h != "secret123"
    assert verify_password("secret123", h)
    assert not verify_password("wrong", h)


def test_access_token_roundtrip():
    tok = create_access_token(user_id=7, org_id=3, role="owner")
    payload = decode_access_token(tok)
    assert payload.sub == 7
    assert payload.org == 3
    assert payload.role == "owner"
    assert payload.exp > int(time.time())


def test_expired_access_token_rejected():
    tok = create_access_token(user_id=1, org_id=1, role="owner", expires_minutes=-1)
    with pytest.raises(TokenError):
        decode_access_token(tok)


def test_garbage_token_rejected():
    with pytest.raises(TokenError):
        decode_access_token("not.a.token")


def test_refresh_token_hash():
    raw, hashed = new_refresh_token()
    assert len(raw) >= 32
    assert hashed == hash_token(raw)
    assert hashed != raw


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("9876543210", "9876543210"),
        ("+91 98765 43210", "9876543210"),
        ("91-9876543210", "9876543210"),
        ("09876543210", "9876543210"),
        ("  98765 43210 ", "9876543210"),
    ],
)
def test_normalize_phone(raw, expected):
    assert normalize_phone(raw) == expected


def test_normalize_phone_rejects_short():
    with pytest.raises(ValueError):
        normalize_phone("12345")
