from datetime import datetime, timedelta, timezone

from httpx import AsyncClient
from sqlmodel import Session, select

from app.core.config import settings
from app.core.security import create_refresh_token, hash_refresh_token, verify_password
from app.models import City, User
from app.models.password_reset_token import PasswordResetToken


def _register_payload(*, city_id, email="nuevo@sesale.com.ar") -> dict:
    return {
        "email": email,
        "password": "Password123!",
        "full_name": "Nueva Persona",
        "doc_type": "dni",
        "doc_number": "12345678",
        "phone": "+5491122334455",
        "public_name": "Nueva Persona Público",
        "public_whatsapp": "+5491122334455",
        "city_id": str(city_id),
    }


async def test_register_creates_user(client: AsyncClient, city: City):
    response = await client.post("/api/auth/register", json=_register_payload(city_id=city.id))

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "nuevo@sesale.com.ar"
    assert body["role"] == "user"
    assert "password" not in body
    assert "hashed_password" not in body


async def test_register_duplicate_email_returns_409(client: AsyncClient, city: City, organizer: User):
    response = await client.post("/api/auth/register", json=_register_payload(city_id=city.id, email=organizer.email))

    assert response.status_code == 409


async def test_register_weak_password_returns_422(client: AsyncClient, city: City):
    payload = _register_payload(city_id=city.id)
    payload["password"] = "short"

    response = await client.post("/api/auth/register", json=payload)

    assert response.status_code == 422


async def test_login_success_returns_access_token_and_sets_cookie(client: AsyncClient, organizer: User):
    response = await client.post(
        "/api/auth/login", json={"email": organizer.email, "password": "Password123!"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert "refresh_token" in response.cookies


async def test_login_success_sets_has_session_marker_cookie(client: AsyncClient, organizer: User):
    response = await client.post(
        "/api/auth/login", json={"email": organizer.email, "password": "Password123!"}
    )

    assert response.status_code == 200
    assert response.cookies.get("has_session") == "1"


async def test_login_wrong_password_returns_401(client: AsyncClient, organizer: User):
    response = await client.post("/api/auth/login", json={"email": organizer.email, "password": "wrong-password"})

    assert response.status_code == 401


async def test_login_unknown_email_returns_401(client: AsyncClient):
    response = await client.post(
        "/api/auth/login", json={"email": "no-existe@sesale.com.ar", "password": "Password123!"}
    )

    assert response.status_code == 401


async def test_refresh_rotates_token(client: AsyncClient, organizer: User):
    login_response = await client.post(
        "/api/auth/login", json={"email": organizer.email, "password": "Password123!"}
    )
    old_cookie = login_response.cookies["refresh_token"]
    client.cookies.set("refresh_token", old_cookie)

    refresh_response = await client.post("/api/auth/refresh")

    assert refresh_response.status_code == 200
    assert refresh_response.json()["access_token"]
    new_cookie = refresh_response.cookies.get("refresh_token")
    assert new_cookie is not None
    assert new_cookie != old_cookie


async def test_refresh_rotates_has_session_marker_cookie(client: AsyncClient, organizer: User):
    login_response = await client.post(
        "/api/auth/login", json={"email": organizer.email, "password": "Password123!"}
    )
    client.cookies.set("refresh_token", login_response.cookies["refresh_token"])

    refresh_response = await client.post("/api/auth/refresh")

    assert refresh_response.status_code == 200
    assert refresh_response.cookies.get("has_session") == "1"


async def test_refresh_without_cookie_returns_401(client: AsyncClient):
    response = await client.post("/api/auth/refresh")

    assert response.status_code == 401


async def test_refresh_with_superseded_token_returns_401(client: AsyncClient, session: Session, organizer: User):
    stale_refresh = create_refresh_token(organizer.id, organizer.role)
    organizer.refresh_token_hash = hash_refresh_token("a-different-token")
    session.add(organizer)
    session.commit()

    client.cookies.set("refresh_token", stale_refresh)
    response = await client.post("/api/auth/refresh")

    assert response.status_code == 401


async def test_logout_clears_session_and_invalidates_refresh(client: AsyncClient, organizer: User):
    login_response = await client.post(
        "/api/auth/login", json={"email": organizer.email, "password": "Password123!"}
    )
    access_token = login_response.json()["access_token"]
    refresh_cookie = login_response.cookies["refresh_token"]

    logout_response = await client.post(
        "/api/auth/logout", headers={"Authorization": f"Bearer {access_token}"}
    )
    assert logout_response.status_code == 204

    client.cookies.set("refresh_token", refresh_cookie)
    refresh_after_logout = await client.post("/api/auth/refresh")
    assert refresh_after_logout.status_code == 401


async def test_logout_clears_has_session_marker_cookie(client: AsyncClient, organizer: User):
    login_response = await client.post(
        "/api/auth/login", json={"email": organizer.email, "password": "Password123!"}
    )
    access_token = login_response.json()["access_token"]

    logout_response = await client.post(
        "/api/auth/logout", headers={"Authorization": f"Bearer {access_token}"}
    )

    assert logout_response.status_code == 204
    has_session_header = next(
        header for header in logout_response.headers.get_list("set-cookie") if header.startswith("has_session=")
    )
    assert "Max-Age=0" in has_session_header


async def test_logout_without_token_returns_401(client: AsyncClient):
    response = await client.post("/api/auth/logout")

    assert response.status_code == 401


async def test_login_rate_limited_after_5_attempts_per_minute(client: AsyncClient, organizer: User):
    # Etapa 9c — rate limiting contra fuerza bruta de contraseñas.
    payload = {"email": organizer.email, "password": "wrong-password"}
    for _ in range(5):
        response = await client.post("/api/auth/login", json=payload)
        assert response.status_code == 401

    response = await client.post("/api/auth/login", json=payload)

    assert response.status_code == 429


async def test_register_rate_limited_after_10_attempts_per_hour(client: AsyncClient, city: City):
    # Etapa 9c — rate limiting contra registro masivo de cuentas.
    for i in range(10):
        response = await client.post(
            "/api/auth/register", json=_register_payload(city_id=city.id, email=f"masivo{i}@sesale.com.ar")
        )
        assert response.status_code == 201

    response = await client.post(
        "/api/auth/register", json=_register_payload(city_id=city.id, email="masivo10@sesale.com.ar")
    )

    assert response.status_code == 429


# Etapa 10e — recuperación de contraseña.


async def test_forgot_password_registered_email_returns_200_without_token_outside_staging(
    client: AsyncClient, organizer: User, monkeypatch
):
    monkeypatch.setattr(settings, "environment", "production")

    response = await client.post("/api/auth/forgot-password", json={"email": organizer.email})

    assert response.status_code == 200
    body = response.json()
    assert body["reset_token"] is None
    assert body["message"] == (
        "Si tu email está registrado, te enviaremos las instrucciones para recuperar tu contraseña."
    )


async def test_forgot_password_unknown_email_returns_200_same_shape(client: AsyncClient, monkeypatch):
    # No revela si el email existe: mismo 200, mismo mensaje, sin token.
    monkeypatch.setattr(settings, "environment", "production")

    response = await client.post("/api/auth/forgot-password", json={"email": "no-existe@sesale.com.ar"})

    assert response.status_code == 200
    assert response.json()["reset_token"] is None


async def test_forgot_password_returns_token_in_staging(client: AsyncClient, organizer: User, monkeypatch):
    monkeypatch.setattr(settings, "environment", "staging")

    response = await client.post("/api/auth/forgot-password", json={"email": organizer.email})

    assert response.status_code == 200
    body = response.json()
    assert body["reset_token"]


async def test_forgot_password_creates_token_row_expiring_in_one_hour(
    client: AsyncClient, session: Session, organizer: User, monkeypatch
):
    monkeypatch.setattr(settings, "environment", "staging")
    before = datetime.now(timezone.utc)

    response = await client.post("/api/auth/forgot-password", json={"email": organizer.email})
    token = response.json()["reset_token"]

    row = session.exec(select(PasswordResetToken).where(PasswordResetToken.token == token)).first()
    assert row is not None
    assert row.user_id == organizer.id
    assert row.used_at is None
    expires_at = row.expires_at if row.expires_at.tzinfo else row.expires_at.replace(tzinfo=timezone.utc)
    assert before + timedelta(minutes=55) < expires_at < before + timedelta(minutes=65)


async def test_reset_password_with_valid_token_updates_password(
    client: AsyncClient, session: Session, organizer: User, monkeypatch
):
    monkeypatch.setattr(settings, "environment", "staging")
    forgot_response = await client.post("/api/auth/forgot-password", json={"email": organizer.email})
    token = forgot_response.json()["reset_token"]

    response = await client.post(
        "/api/auth/reset-password", json={"token": token, "new_password": "NuevaPassword123!"}
    )

    assert response.status_code == 200
    session.refresh(organizer)
    assert verify_password("NuevaPassword123!", organizer.hashed_password)

    login_response = await client.post(
        "/api/auth/login", json={"email": organizer.email, "password": "NuevaPassword123!"}
    )
    assert login_response.status_code == 200


async def test_reset_password_invalidates_used_token(client: AsyncClient, organizer: User, monkeypatch):
    monkeypatch.setattr(settings, "environment", "staging")
    forgot_response = await client.post("/api/auth/forgot-password", json={"email": organizer.email})
    token = forgot_response.json()["reset_token"]

    first = await client.post("/api/auth/reset-password", json={"token": token, "new_password": "PrimeraVez123!"})
    assert first.status_code == 200

    second = await client.post("/api/auth/reset-password", json={"token": token, "new_password": "SegundaVez123!"})
    assert second.status_code == 400


async def test_reset_password_with_expired_token_returns_400(
    client: AsyncClient, session: Session, organizer: User
):
    expired_token = PasswordResetToken(
        user_id=organizer.id,
        token="expired-token",
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
    )
    session.add(expired_token)
    session.commit()

    response = await client.post(
        "/api/auth/reset-password", json={"token": "expired-token", "new_password": "NuevaPassword123!"}
    )

    assert response.status_code == 400


async def test_reset_password_with_unknown_token_returns_400(client: AsyncClient):
    response = await client.post(
        "/api/auth/reset-password", json={"token": "no-existe", "new_password": "NuevaPassword123!"}
    )

    assert response.status_code == 400


async def test_reset_password_weak_password_returns_422(client: AsyncClient, organizer: User, monkeypatch):
    monkeypatch.setattr(settings, "environment", "staging")
    forgot_response = await client.post("/api/auth/forgot-password", json={"email": organizer.email})
    token = forgot_response.json()["reset_token"]

    response = await client.post("/api/auth/reset-password", json={"token": token, "new_password": "short"})

    assert response.status_code == 422


async def test_forgot_password_requesting_twice_invalidates_first_token(
    client: AsyncClient, session: Session, organizer: User, monkeypatch
):
    # Etapa 11a: pedir "olvidé mi contraseña" dos veces no debe dejar dos
    # tokens válidos circulando — el primero queda invalidado.
    monkeypatch.setattr(settings, "environment", "staging")

    first_response = await client.post("/api/auth/forgot-password", json={"email": organizer.email})
    first_token = first_response.json()["reset_token"]

    second_response = await client.post("/api/auth/forgot-password", json={"email": organizer.email})
    second_token = second_response.json()["reset_token"]

    assert first_token != second_token

    stale = await client.post(
        "/api/auth/reset-password", json={"token": first_token, "new_password": "NuevaPassword123!"}
    )
    assert stale.status_code == 400

    fresh = await client.post(
        "/api/auth/reset-password", json={"token": second_token, "new_password": "NuevaPassword123!"}
    )
    assert fresh.status_code == 200


async def test_forgot_password_rate_limited_after_3_attempts_per_hour(
    client: AsyncClient, organizer: User
):
    for _ in range(3):
        response = await client.post("/api/auth/forgot-password", json={"email": organizer.email})
        assert response.status_code == 200

    response = await client.post("/api/auth/forgot-password", json={"email": organizer.email})

    assert response.status_code == 429


async def test_forgot_password_sends_real_email_when_resend_configured(
    client: AsyncClient, organizer: User, monkeypatch
):
    monkeypatch.setattr(settings, "environment", "staging")
    monkeypatch.setattr(settings, "resend_api_key", "re_test_key")

    sent: dict = {}

    async def fake_send_password_reset_email(user_email, user_name, reset_url):
        sent["user_email"] = user_email
        sent["user_name"] = user_name
        sent["reset_url"] = reset_url

    monkeypatch.setattr("app.routers.auth.send_password_reset_email", fake_send_password_reset_email)

    response = await client.post("/api/auth/forgot-password", json={"email": organizer.email})

    assert response.status_code == 200
    # Con Resend configurado, no hay que devolver el token en la respuesta
    # HTTP aunque estemos en staging — ya se lo mandamos por email.
    assert response.json()["reset_token"] is None
    assert sent["user_email"] == organizer.email
    assert "/reset-contrasena?token=" in sent["reset_url"]


async def test_forgot_password_unknown_email_does_not_send_email(client: AsyncClient, monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", "re_test_key")

    called = False

    async def fake_send_password_reset_email(*args, **kwargs):
        nonlocal called
        called = True

    monkeypatch.setattr("app.routers.auth.send_password_reset_email", fake_send_password_reset_email)

    response = await client.post("/api/auth/forgot-password", json={"email": "no-existe@sesale.com.ar"})

    assert response.status_code == 200
    assert called is False


async def test_reset_password_clears_active_session(client: AsyncClient, session: Session, organizer: User, monkeypatch):
    # Cambiar la password invalida cualquier sesión activa (refresh token).
    login_response = await client.post(
        "/api/auth/login", json={"email": organizer.email, "password": "Password123!"}
    )
    refresh_cookie = login_response.cookies["refresh_token"]

    monkeypatch.setattr(settings, "environment", "staging")
    forgot_response = await client.post("/api/auth/forgot-password", json={"email": organizer.email})
    token = forgot_response.json()["reset_token"]
    await client.post("/api/auth/reset-password", json={"token": token, "new_password": "NuevaPassword123!"})

    client.cookies.set("refresh_token", refresh_cookie)
    refresh_after_reset = await client.post("/api/auth/refresh")
    assert refresh_after_reset.status_code == 401
