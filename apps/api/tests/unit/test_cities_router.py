from datetime import date, time

from httpx import AsyncClient
from sqlmodel import Session

from app.models import City, Event, EventStatus


async def test_list_cities_returns_only_active(client: AsyncClient, session: Session, city: City):
    inactive_city = City(name="Ciudad Inactiva", province="Río Negro", is_active=False)
    session.add(inactive_city)
    session.commit()

    response = await client.get("/api/cities")

    assert response.status_code == 200
    names = [c["name"] for c in response.json()]
    assert city.name in names
    assert "Ciudad Inactiva" not in names


async def test_list_cities_requires_no_auth(client: AsyncClient, city: City):
    response = await client.get("/api/cities")

    assert response.status_code == 200


async def test_list_cities_includes_latitude_and_longitude(
    client: AsyncClient, session: Session, city: City
):
    city.latitude = -39.0333
    city.longitude = -67.5833
    session.add(city)
    session.commit()

    response = await client.get("/api/cities")

    assert response.status_code == 200
    body = next(c for c in response.json() if c["id"] == str(city.id))
    assert body["latitude"] == -39.0333
    assert body["longitude"] == -67.5833


async def test_list_cities_allows_null_coordinates(client: AsyncClient, city: City):
    response = await client.get("/api/cities")

    assert response.status_code == 200
    body = next(c for c in response.json() if c["id"] == str(city.id))
    assert body["latitude"] is None
    assert body["longitude"] is None


# Etapa 8a — PATCH /api/cities/{id}/toggle


async def test_toggle_city_by_admin_without_events_succeeds(
    client: AsyncClient, city: City, admin_token_headers: dict[str, str]
):
    assert city.is_active is True

    response = await client.patch(f"/api/cities/{city.id}/toggle", headers=admin_token_headers)

    assert response.status_code == 200
    assert response.json()["is_active"] is False


async def test_toggle_city_by_admin_enables_disabled_city_without_restrictions(
    client: AsyncClient, session: Session, city: City, admin_token_headers: dict[str, str]
):
    city.is_active = False
    session.add(city)
    session.commit()

    response = await client.patch(f"/api/cities/{city.id}/toggle", headers=admin_token_headers)

    assert response.status_code == 200
    assert response.json()["is_active"] is True


async def test_toggle_city_by_admin_with_future_active_events_returns_409(
    client: AsyncClient, session: Session, city: City, organizer, location, admin_token_headers: dict[str, str]
):
    event = Event(
        city_id=city.id,
        organizer_id=organizer.id,
        location_id=location.id,
        title="Evento futuro",
        date=date(2999, 1, 1),
        time=time(21, 0),
        status=EventStatus.approved,
        is_active=True,
    )
    session.add(event)
    session.commit()

    response = await client.patch(f"/api/cities/{city.id}/toggle", headers=admin_token_headers)

    assert response.status_code == 409
    assert "1 evento" in response.json()["detail"]


async def test_toggle_city_by_user_returns_403(client: AsyncClient, city: City, user_token_headers: dict[str, str]):
    response = await client.patch(f"/api/cities/{city.id}/toggle", headers=user_token_headers)

    assert response.status_code == 403


async def test_toggle_city_without_auth_returns_401(client: AsyncClient, city: City):
    response = await client.patch(f"/api/cities/{city.id}/toggle")

    assert response.status_code == 401


async def test_toggle_city_nonexistent_returns_404(client: AsyncClient, admin_token_headers: dict[str, str]):
    response = await client.patch(
        "/api/cities/00000000-0000-0000-0000-000000000000/toggle", headers=admin_token_headers
    )

    assert response.status_code == 404
