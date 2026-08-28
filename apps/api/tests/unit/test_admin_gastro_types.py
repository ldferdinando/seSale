from datetime import date, time

from httpx import AsyncClient
from sqlmodel import Session, select

from app.models import City, Event, EventStatus, Location, User
from app.models.gastro_type_catalog import GastroTypeCatalog
from app.models.location_gastro_type import LocationGastroType


async def test_get_admin_gastro_types_includes_inactive(
    client: AsyncClient, session: Session, admin_token_headers: dict[str, str]
):
    inactive = session.exec(select(GastroTypeCatalog).where(GastroTypeCatalog.key == "otro")).one()
    inactive.is_active = False
    session.add(inactive)
    session.commit()

    response = await client.get("/api/admin/gastro-types", headers=admin_token_headers)

    assert response.status_code == 200
    keys = [t["key"] for t in response.json()]
    assert "otro" in keys
    assert "bar" in keys


async def test_get_admin_gastro_types_by_user_returns_403(client: AsyncClient, user_token_headers: dict[str, str]):
    response = await client.get("/api/admin/gastro-types", headers=user_token_headers)

    assert response.status_code == 403


async def test_get_admin_gastro_types_without_auth_returns_401(client: AsyncClient):
    response = await client.get("/api/admin/gastro-types")

    assert response.status_code == 401


async def test_post_admin_gastro_type_success(client: AsyncClient, admin_token_headers: dict[str, str]):
    payload = {"key": "vegano", "name": "Vegano", "emoji": "🥗", "sort_order": 20}

    response = await client.post("/api/admin/gastro-types", json=payload, headers=admin_token_headers)

    assert response.status_code == 201
    body = response.json()
    assert body["key"] == "vegano"
    assert body["is_active"] is True


async def test_post_admin_gastro_type_duplicate_key_returns_409(
    client: AsyncClient, admin_token_headers: dict[str, str]
):
    payload = {"key": "bar", "name": "Otro bar"}

    response = await client.post("/api/admin/gastro-types", json=payload, headers=admin_token_headers)

    assert response.status_code == 409


async def test_post_admin_gastro_type_key_with_spaces_returns_422(
    client: AsyncClient, admin_token_headers: dict[str, str]
):
    payload = {"key": "comida rapida", "name": "Comida rápida"}

    response = await client.post("/api/admin/gastro-types", json=payload, headers=admin_token_headers)

    assert response.status_code == 422


async def test_put_admin_gastro_type_does_not_allow_changing_key(
    client: AsyncClient, session: Session, admin_token_headers: dict[str, str]
):
    gastro_type = session.exec(select(GastroTypeCatalog).where(GastroTypeCatalog.key == "bar")).one()
    payload = {"key": "otra-key", "name": "Bar actualizado", "sort_order": 1}

    response = await client.put(
        f"/api/admin/gastro-types/{gastro_type.id}", json=payload, headers=admin_token_headers
    )

    assert response.status_code == 200
    assert response.json()["key"] == "bar"
    assert response.json()["name"] == "Bar actualizado"


async def test_patch_admin_gastro_type_toggle_with_future_events_returns_409(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    location: Location,
    admin_token_headers: dict[str, str],
):
    gastro_type = session.exec(select(GastroTypeCatalog).where(GastroTypeCatalog.key == "bar")).one()
    location.is_gastro = True
    session.add(location)
    session.add(LocationGastroType(location_id=location.id, gastro_type="bar"))
    event = Event(
        city_id=city.id,
        organizer_id=organizer.id,
        location_id=location.id,
        title="Evento futuro",
        date=date(2999, 1, 1),
        time=time(21, 0),
        time_end=time(23, 0),
        status=EventStatus.approved,
        is_active=True,
    )
    session.add(event)
    session.commit()

    response = await client.patch(
        f"/api/admin/gastro-types/{gastro_type.id}/toggle", headers=admin_token_headers
    )

    assert response.status_code == 409
    session.refresh(gastro_type)
    assert gastro_type.is_active is True


async def test_patch_admin_gastro_type_toggle_without_future_events_deactivates(
    client: AsyncClient, session: Session, admin_token_headers: dict[str, str]
):
    gastro_type = session.exec(select(GastroTypeCatalog).where(GastroTypeCatalog.key == "otro")).one()

    response = await client.patch(
        f"/api/admin/gastro-types/{gastro_type.id}/toggle", headers=admin_token_headers
    )

    assert response.status_code == 200
    assert response.json()["is_active"] is False


async def test_patch_admin_gastro_type_toggle_reactivates_without_restriction(
    client: AsyncClient, session: Session, admin_token_headers: dict[str, str]
):
    gastro_type = session.exec(select(GastroTypeCatalog).where(GastroTypeCatalog.key == "otro")).one()
    gastro_type.is_active = False
    session.add(gastro_type)
    session.commit()

    response = await client.patch(
        f"/api/admin/gastro-types/{gastro_type.id}/toggle", headers=admin_token_headers
    )

    assert response.status_code == 200
    assert response.json()["is_active"] is True
