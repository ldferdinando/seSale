from datetime import date, time

from httpx import AsyncClient
from sqlmodel import Session

from app.models import City, Event, EventStatus, Location, User


async def test_get_admin_cities_includes_inactive_cities(
    client: AsyncClient, session: Session, city: City, admin_token_headers: dict[str, str]
):
    inactive = City(name="Ciudad Inactiva", province="Río Negro", is_active=False)
    session.add(inactive)
    session.commit()

    response = await client.get("/api/admin/cities", headers=admin_token_headers)

    assert response.status_code == 200
    names = [c["name"] for c in response.json()]
    assert city.name in names
    assert "Ciudad Inactiva" in names


async def test_get_admin_cities_includes_active_events_count(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    location: Location,
    admin_token_headers: dict[str, str],
):
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

    response = await client.get("/api/admin/cities", headers=admin_token_headers)

    assert response.status_code == 200
    body = next(c for c in response.json() if c["id"] == str(city.id))
    assert body["active_events_count"] == 1


async def test_get_admin_cities_by_user_returns_403(client: AsyncClient, city: City, user_token_headers: dict[str, str]):
    response = await client.get("/api/admin/cities", headers=user_token_headers)

    assert response.status_code == 403


async def test_get_admin_cities_without_auth_returns_401(client: AsyncClient, city: City):
    response = await client.get("/api/admin/cities")

    assert response.status_code == 401


async def test_patch_admin_city_sort_order_by_admin_updates_value(
    client: AsyncClient, city: City, admin_token_headers: dict[str, str]
):
    response = await client.patch(
        f"/api/admin/cities/{city.id}/sort-order", json={"sort_order": 3}, headers=admin_token_headers
    )

    assert response.status_code == 200
    assert response.json()["sort_order"] == 3


async def test_patch_admin_city_sort_order_by_user_returns_403(
    client: AsyncClient, city: City, user_token_headers: dict[str, str]
):
    response = await client.patch(
        f"/api/admin/cities/{city.id}/sort-order", json={"sort_order": 3}, headers=user_token_headers
    )

    assert response.status_code == 403


async def test_patch_admin_city_sort_order_nonexistent_returns_404(
    client: AsyncClient, admin_token_headers: dict[str, str]
):
    response = await client.patch(
        "/api/admin/cities/00000000-0000-0000-0000-000000000000/sort-order",
        json={"sort_order": 1},
        headers=admin_token_headers,
    )

    assert response.status_code == 404


async def test_patch_admin_city_sort_order_negative_returns_422(
    client: AsyncClient, city: City, admin_token_headers: dict[str, str]
):
    response = await client.patch(
        f"/api/admin/cities/{city.id}/sort-order", json={"sort_order": -1}, headers=admin_token_headers
    )

    assert response.status_code == 422
