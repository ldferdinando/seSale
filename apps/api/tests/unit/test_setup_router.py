import pytest
from httpx import AsyncClient
from sqlmodel import Session

from app.core.config import settings
from app.models import User


def _payload(email: str = "primer-admin@sesale.com.ar") -> dict:
    return {
        "email": email,
        "password": "password-seguro-123",
        "full_name": "Admin seSALE",
        "public_name": "seSALE Admin",
    }


async def test_setup_admin_without_existing_admin_creates_admin(client: AsyncClient, session: Session):
    response = await client.post("/api/setup/admin", json=_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["role"] == "admin"
    assert body["is_verified"] is True
    assert body["is_active"] is True
    assert body["email_verified"] is True
    assert "password" not in body
    assert "hashed_password" not in body


async def test_setup_admin_with_existing_admin_returns_410(client: AsyncClient, admin: User):
    response = await client.post("/api/setup/admin", json=_payload())

    assert response.status_code == 410
    assert response.json()["detail"] == "Setup already completed. This endpoint is permanently disabled."


async def test_setup_admin_twice_second_call_returns_410(client: AsyncClient, session: Session):
    first = await client.post("/api/setup/admin", json=_payload())
    assert first.status_code == 201

    second = await client.post("/api/setup/admin", json=_payload(email="otro-admin@sesale.com.ar"))

    assert second.status_code == 410


async def test_setup_admin_disabled_by_env_returns_410_without_querying_db(
    client: AsyncClient, session: Session, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(settings, "disable_setup_endpoint", True)

    def _fail_if_called(*args, **kwargs):
        raise AssertionError("admin_exists() no debería llamarse con DISABLE_SETUP_ENDPOINT=true")

    monkeypatch.setattr("app.routers.setup.admin_exists", _fail_if_called)

    response = await client.post("/api/setup/admin", json=_payload())

    assert response.status_code == 410
    assert response.json()["detail"] == "Setup already completed. This endpoint is permanently disabled."


async def test_setup_admin_password_too_short_returns_422(client: AsyncClient, session: Session):
    payload = _payload()
    payload["password"] = "corta1234"  # 9 caracteres, < 12

    response = await client.post("/api/setup/admin", json=payload)

    assert response.status_code == 422


async def test_setup_admin_rate_limited_after_5_attempts_per_hour(client: AsyncClient, session: Session):
    # El primer intento crea el admin (201); los siguientes 4 ya devuelven
    # 410 (admin_exists) — el rate limit cuenta todos los intentos igual.
    first = await client.post("/api/setup/admin", json=_payload())
    assert first.status_code == 201

    for i in range(4):
        response = await client.post("/api/setup/admin", json=_payload(email=f"otro{i}@sesale.com.ar"))
        assert response.status_code == 410

    response = await client.post("/api/setup/admin", json=_payload(email="sexto@sesale.com.ar"))

    assert response.status_code == 429
