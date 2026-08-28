from datetime import date, time

from httpx import AsyncClient
from sqlmodel import Session, select

from app.models import City, Event, EventStatus, Location, User
from app.models.category import EventCategory
from app.models.event_category_catalog import EventCategoryCatalog


async def test_get_admin_categories_includes_inactive(
    client: AsyncClient, session: Session, admin_token_headers: dict[str, str]
):
    inactive = session.exec(
        select(EventCategoryCatalog).where(EventCategoryCatalog.key == "deportes")
    ).one()
    inactive.is_active = False
    session.add(inactive)
    session.commit()

    response = await client.get("/api/admin/categories", headers=admin_token_headers)

    assert response.status_code == 200
    keys = [c["key"] for c in response.json()]
    assert "deportes" in keys
    assert "musica" in keys


async def test_get_admin_categories_filter_is_active(
    client: AsyncClient, session: Session, admin_token_headers: dict[str, str]
):
    inactive = session.exec(
        select(EventCategoryCatalog).where(EventCategoryCatalog.key == "deportes")
    ).one()
    inactive.is_active = False
    session.add(inactive)
    session.commit()

    response = await client.get("/api/admin/categories?is_active=false", headers=admin_token_headers)

    assert response.status_code == 200
    keys = [c["key"] for c in response.json()]
    assert keys == ["deportes"]


async def test_get_admin_categories_by_user_returns_403(client: AsyncClient, user_token_headers: dict[str, str]):
    response = await client.get("/api/admin/categories", headers=user_token_headers)

    assert response.status_code == 403


async def test_get_admin_categories_without_auth_returns_401(client: AsyncClient):
    response = await client.get("/api/admin/categories")

    assert response.status_code == 401


async def test_post_admin_category_success(client: AsyncClient, admin_token_headers: dict[str, str]):
    payload = {"key": "sushi", "name": "Sushi", "emoji": "🍣", "sort_order": 20}

    response = await client.post("/api/admin/categories", json=payload, headers=admin_token_headers)

    assert response.status_code == 201
    body = response.json()
    assert body["key"] == "sushi"
    assert body["is_active"] is True


async def test_post_admin_category_duplicate_key_returns_409(
    client: AsyncClient, admin_token_headers: dict[str, str]
):
    payload = {"key": "musica", "name": "Otra música"}

    response = await client.post("/api/admin/categories", json=payload, headers=admin_token_headers)

    assert response.status_code == 409


async def test_post_admin_category_key_with_spaces_returns_422(
    client: AsyncClient, admin_token_headers: dict[str, str]
):
    payload = {"key": "musica en vivo", "name": "Música en vivo"}

    response = await client.post("/api/admin/categories", json=payload, headers=admin_token_headers)

    assert response.status_code == 422


async def test_post_admin_category_key_with_uppercase_returns_422(
    client: AsyncClient, admin_token_headers: dict[str, str]
):
    payload = {"key": "Musica", "name": "Música"}

    response = await client.post("/api/admin/categories", json=payload, headers=admin_token_headers)

    assert response.status_code == 422


async def test_put_admin_category_does_not_allow_changing_key(
    client: AsyncClient, session: Session, admin_token_headers: dict[str, str]
):
    category = session.exec(select(EventCategoryCatalog).where(EventCategoryCatalog.key == "musica")).one()
    payload = {"key": "otra-key", "name": "Música actualizada", "sort_order": 1}

    response = await client.put(
        f"/api/admin/categories/{category.id}", json=payload, headers=admin_token_headers
    )

    assert response.status_code == 200
    assert response.json()["key"] == "musica"
    assert response.json()["name"] == "Música actualizada"


async def test_patch_admin_category_toggle_with_future_events_returns_409(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    location: Location,
    admin_token_headers: dict[str, str],
):
    category = session.exec(select(EventCategoryCatalog).where(EventCategoryCatalog.key == "musica")).one()
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
    session.flush()
    session.add(EventCategory(event_id=event.id, category="musica"))
    session.commit()

    response = await client.patch(
        f"/api/admin/categories/{category.id}/toggle", headers=admin_token_headers
    )

    assert response.status_code == 409
    session.refresh(category)
    assert category.is_active is True


async def test_patch_admin_category_toggle_without_future_events_deactivates(
    client: AsyncClient, session: Session, admin_token_headers: dict[str, str]
):
    category = session.exec(select(EventCategoryCatalog).where(EventCategoryCatalog.key == "cine")).one()

    response = await client.patch(
        f"/api/admin/categories/{category.id}/toggle", headers=admin_token_headers
    )

    assert response.status_code == 200
    assert response.json()["is_active"] is False


async def test_patch_admin_category_toggle_reactivates_without_restriction(
    client: AsyncClient, session: Session, admin_token_headers: dict[str, str]
):
    category = session.exec(select(EventCategoryCatalog).where(EventCategoryCatalog.key == "cine")).one()
    category.is_active = False
    session.add(category)
    session.commit()

    response = await client.patch(
        f"/api/admin/categories/{category.id}/toggle", headers=admin_token_headers
    )

    assert response.status_code == 200
    assert response.json()["is_active"] is True
