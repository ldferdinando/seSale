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


async def test_update_me_can_edit_doc_type_and_doc_number(
    client: AsyncClient, organizer: User, user_token_headers: dict[str, str]
):
    # Etapa 11a — BUG 5: doc_type/doc_number faltaban en UserUpdate — sin
    # esto, /mi-cuenta no podía editar el documento del propio usuario.
    response = await client.put(
        "/api/users/me",
        json={"doc_type": "dni", "doc_number": "30123456"},
        headers=user_token_headers,
    )

    assert response.status_code == 200
    assert response.json()["doc_type"] == "dni"
    assert response.json()["doc_number"] == "30123456"


async def test_update_me_cannot_change_email_or_role(
    client: AsyncClient, organizer: User, user_token_headers: dict[str, str]
):
    response = await client.put(
        "/api/users/me",
        json={"email": "otro@sesale.com.ar", "role": "admin"},
        headers=user_token_headers,
    )

    # UserUpdate no declara ni email ni role — Pydantic los ignora en vez de
    # rechazarlos (no hay extra="forbid"), así que el usuario sigue como
    # estaba: ni el email ni el rol cambiaron.
    assert response.status_code == 200
    assert response.json()["email"] == organizer.email
    assert response.json()["role"] == "user"


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


# Etapa 11a — BUG 4: PATCH /api/users/{id} ampliado de solo `is_active` a
# la edición completa del admin (antes UserDetailModal.tsx era 100% de
# solo lectura para estos campos).


async def test_admin_can_edit_full_user_data(
    client: AsyncClient, organizer: User, admin_token_headers: dict[str, str]
):
    response = await client.patch(
        f"/api/users/{organizer.id}",
        json={
            "full_name": "Nombre Real Editado",
            "public_name": "Nombre Público Editado",
            "doc_type": "cuit",
            "doc_number": "20304050607",
            "phone": "+5492984000000",
            "public_whatsapp": "+5492984111111",
        },
        headers=admin_token_headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["full_name"] == "Nombre Real Editado"
    assert body["public_name"] == "Nombre Público Editado"
    assert body["doc_type"] == "cuit"
    assert body["doc_number"] == "20304050607"
    assert body["phone"] == "+5492984000000"
    assert body["public_whatsapp"] == "+5492984111111"


async def test_admin_can_edit_role_and_verified_from_same_endpoint(
    client: AsyncClient, organizer: User, admin_token_headers: dict[str, str]
):
    response = await client.patch(
        f"/api/users/{organizer.id}",
        json={"role": "admin", "is_verified": True},
        headers=admin_token_headers,
    )

    assert response.status_code == 200
    assert response.json()["role"] == "admin"
    assert response.json()["is_verified"] is True


async def test_admin_edit_with_invalid_role_returns_422(
    client: AsyncClient, organizer: User, admin_token_headers: dict[str, str]
):
    response = await client.patch(
        f"/api/users/{organizer.id}", json={"role": "superadmin"}, headers=admin_token_headers
    )

    assert response.status_code == 422


async def test_admin_edit_full_user_data_as_non_admin_returns_403(
    client: AsyncClient, organizer: User, user_token_headers: dict[str, str]
):
    response = await client.patch(
        f"/api/users/{organizer.id}", json={"full_name": "Intento no autorizado"}, headers=user_token_headers
    )

    assert response.status_code == 403


async def test_admin_edit_cannot_change_email(
    client: AsyncClient, organizer: User, admin_token_headers: dict[str, str]
):
    response = await client.patch(
        f"/api/users/{organizer.id}",
        json={"email": "cambiado@sesale.com.ar", "full_name": "Nombre Editado"},
        headers=admin_token_headers,
    )

    # AdminUserUpdate no declara `email` — Pydantic lo ignora en vez de
    # rechazarlo (no hay extra="forbid"), así que el email queda intacto.
    assert response.status_code == 200
    assert response.json()["email"] == organizer.email
    assert response.json()["full_name"] == "Nombre Editado"
