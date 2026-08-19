from httpx import AsyncClient
from sqlmodel import Session

from app.core.security import create_refresh_token, hash_refresh_token
from app.models import City, User


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
