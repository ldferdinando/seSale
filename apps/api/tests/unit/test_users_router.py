from uuid import uuid4

from httpx import AsyncClient
from sqlmodel import Session

from app.models import User


async def test_get_me_returns_current_user(client: AsyncClient, organizer: User, user_token_headers: dict[str, str]):
    response = await client.get("/api/users/me", headers=user_token_headers)

    assert response.status_code == 200
    assert response.json()["email"] == organizer.email


async def test_get_me_returns_profile_fields(
    client: AsyncClient, organizer: User, user_token_headers: dict[str, str]
):
    response = await client.get("/api/users/me", headers=user_token_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["public_name"] == organizer.public_name
    assert body["is_verified"] is False
    assert body["phone_verified"] is False
    assert body["email_verified"] is False
    assert "created_at" in body
    assert body["created_by"] is None


async def test_get_me_without_token_returns_401(client: AsyncClient):
    response = await client.get("/api/users/me")

    assert response.status_code == 401


async def test_update_me_applies_partial_update(
    client: AsyncClient, organizer: User, user_token_headers: dict[str, str]
):
    response = await client.put(
        "/api/users/me", json={"public_name": "Nuevo Nombre Público"}, headers=user_token_headers
    )

    assert response.status_code == 200
    assert response.json()["public_name"] == "Nuevo Nombre Público"
    assert response.json()["full_name"] == organizer.full_name


async def test_list_users_requires_admin(client: AsyncClient, user_token_headers: dict[str, str]):
    response = await client.get("/api/users", headers=user_token_headers)

    assert response.status_code == 403


async def test_list_users_as_admin(
    client: AsyncClient, organizer: User, admin_token_headers: dict[str, str]
):
    response = await client.get("/api/users", headers=admin_token_headers)

    assert response.status_code == 200
    emails = [u["email"] for u in response.json()]
    assert organizer.email in emails


async def test_get_user_by_id_as_admin(
    client: AsyncClient, organizer: User, admin_token_headers: dict[str, str]
):
    response = await client.get(f"/api/users/{organizer.id}", headers=admin_token_headers)

    assert response.status_code == 200
    assert response.json()["id"] == str(organizer.id)


async def test_get_unknown_user_returns_404(client: AsyncClient, admin_token_headers: dict[str, str]):
    response = await client.get(f"/api/users/{uuid4()}", headers=admin_token_headers)

    assert response.status_code == 404


async def test_verify_user_as_admin(
    client: AsyncClient, organizer: User, admin_token_headers: dict[str, str]
):
    response = await client.patch(f"/api/users/{organizer.id}/verify", headers=admin_token_headers)

    assert response.status_code == 200
    assert response.json()["is_verified"] is True


async def test_unverify_user_as_admin(
    client: AsyncClient, session: Session, organizer: User, admin_token_headers: dict[str, str]
):
    """Etapa 9d — toggle bidireccional: {"is_verified": false} revierte."""
    organizer.is_verified = True
    session.add(organizer)
    session.commit()

    response = await client.patch(
        f"/api/users/{organizer.id}/verify",
        json={"is_verified": False},
        headers=admin_token_headers,
    )

    assert response.status_code == 200
    assert response.json()["is_verified"] is False


async def test_verify_user_as_non_admin_returns_403(
    client: AsyncClient, organizer: User, user_token_headers: dict[str, str]
):
    response = await client.patch(f"/api/users/{organizer.id}/verify", headers=user_token_headers)

    assert response.status_code == 403


async def test_update_user_role_as_admin(
    client: AsyncClient, organizer: User, admin_token_headers: dict[str, str]
):
    response = await client.patch(
        f"/api/users/{organizer.id}/role", json={"role": "admin"}, headers=admin_token_headers
    )

    assert response.status_code == 200
    assert response.json()["role"] == "admin"


async def test_update_user_role_rejects_invalid_role(
    client: AsyncClient, organizer: User, admin_token_headers: dict[str, str]
):
    response = await client.patch(
        f"/api/users/{organizer.id}/role", json={"role": "superadmin"}, headers=admin_token_headers
    )

    assert response.status_code == 422


async def test_update_user_role_as_non_admin_returns_403(
    client: AsyncClient, organizer: User, user_token_headers: dict[str, str]
):
    response = await client.patch(
        f"/api/users/{organizer.id}/role", json={"role": "admin"}, headers=user_token_headers
    )

    assert response.status_code == 403


async def test_update_user_active_as_admin(
    client: AsyncClient, organizer: User, admin_token_headers: dict[str, str]
):
    response = await client.patch(
        f"/api/users/{organizer.id}", json={"is_active": False}, headers=admin_token_headers
    )

    assert response.status_code == 200
    assert response.json()["is_active"] is False


async def test_update_user_active_as_non_admin_returns_403(
    client: AsyncClient, organizer: User, user_token_headers: dict[str, str]
):
    response = await client.patch(
        f"/api/users/{organizer.id}", json={"is_active": False}, headers=user_token_headers
    )

    assert response.status_code == 403
