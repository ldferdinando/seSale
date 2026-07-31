from uuid import uuid4

import pytest

from app.core import security


def test_hash_password_roundtrip() -> None:
    hashed = security.hash_password("SuperSecreta123")
    assert hashed != "SuperSecreta123"
    assert security.verify_password("SuperSecreta123", hashed)
    assert not security.verify_password("otra-cosa", hashed)


def test_access_token_roundtrip() -> None:
    user_id = uuid4()
    token = security.create_access_token(user_id, "user")
    payload = security.decode_token(token, expected_type="access")
    assert payload["sub"] == str(user_id)
    assert payload["role"] == "user"
    assert payload["type"] == "access"


def test_refresh_token_roundtrip() -> None:
    user_id = uuid4()
    token = security.create_refresh_token(user_id, "admin")
    payload = security.decode_token(token, expected_type="refresh")
    assert payload["sub"] == str(user_id)
    assert payload["role"] == "admin"


def test_decode_token_wrong_type_rejected() -> None:
    user_id = uuid4()
    access_token = security.create_access_token(user_id, "user")
    with pytest.raises(ValueError):
        security.decode_token(access_token, expected_type="refresh")


def test_decode_token_tampered_signature_rejected() -> None:
    user_id = uuid4()
    token = security.create_access_token(user_id, "user")
    tampered = token[:-2] + ("aa" if token[-2:] != "aa" else "bb")
    with pytest.raises(ValueError):
        security.decode_token(tampered, expected_type="access")


def test_decode_token_expired_rejected() -> None:
    import jose.jwt as jose_jwt
    from datetime import datetime, timedelta, timezone

    from app.core.config import settings

    user_id = uuid4()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": "user",
        "type": "access",
        "iat": now - timedelta(minutes=60),
        "exp": now - timedelta(minutes=30),
    }
    expired_token = jose_jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
    with pytest.raises(ValueError):
        security.decode_token(expired_token, expected_type="access")


def test_hash_refresh_token_is_deterministic_and_not_reversible() -> None:
    raw = "some-refresh-token-value"
    h1 = security.hash_refresh_token(raw)
    h2 = security.hash_refresh_token(raw)
    assert h1 == h2
    assert h1 != raw
