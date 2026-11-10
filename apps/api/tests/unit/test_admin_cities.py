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


async def test_post_admin_city_success_creates_active_city_with_default_sort_order(
    client: AsyncClient, city: City, admin_token_headers: dict[str, str]
):
    payload = {
        "name": "San Martín de los Andes",
        "province": "Neuquén",
        "emoji": "🏔️",
        "latitude": -40.1583,
        "longitude": -71.3519,
    }

    response = await client.post("/api/admin/cities", json=payload, headers=admin_token_headers)

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == payload["name"]
    assert body["province"] == payload["province"]
    assert body["is_active"] is True
    assert body["sort_order"] == city.sort_order + 1
    assert body["active_events_count"] == 0


async def test_post_admin_city_with_explicit_sort_order_uses_it(
    client: AsyncClient, admin_token_headers: dict[str, str]
):
    payload = {"name": "Chos Malal", "province": "Neuquén", "sort_order": 7}

    response = await client.post("/api/admin/cities", json=payload, headers=admin_token_headers)

    assert response.status_code == 201
    assert response.json()["sort_order"] == 7


async def test_post_admin_city_empty_name_returns_422(client: AsyncClient, admin_token_headers: dict[str, str]):
    response = await client.post(
        "/api/admin/cities", json={"name": "", "province": "Neuquén"}, headers=admin_token_headers
    )

    assert response.status_code == 422


async def test_post_admin_city_invalid_latitude_returns_422(client: AsyncClient, admin_token_headers: dict[str, str]):
    response = await client.post(
        "/api/admin/cities",
        json={"name": "Zapala", "province": "Neuquén", "latitude": 200},
        headers=admin_token_headers,
    )

    assert response.status_code == 422


async def test_post_admin_city_duplicate_name_and_province_returns_409(
    client: AsyncClient, city: City, admin_token_headers: dict[str, str]
):
    response = await client.post(
        "/api/admin/cities",
        json={"name": city.name.upper(), "province": city.province},
        headers=admin_token_headers,
    )

    assert response.status_code == 409


async def test_post_admin_city_by_user_returns_403(client: AsyncClient, user_token_headers: dict[str, str]):
    response = await client.post(
        "/api/admin/cities", json={"name": "Junín", "province": "Neuquén"}, headers=user_token_headers
    )

    assert response.status_code == 403


async def test_post_admin_city_without_auth_returns_401(client: AsyncClient):
    response = await client.post("/api/admin/cities", json={"name": "Junín", "province": "Neuquén"})

    assert response.status_code == 401


# DELETE /api/admin/cities/{city_id}


async def test_delete_admin_city_without_dependents_succeeds(
    client: AsyncClient, session: Session, admin_token_headers: dict[str, str]
):
    extra = City(name="Ciudad a Borrar", province="Río Negro")
    session.add(extra)
    session.commit()

    response = await client.delete(f"/api/admin/cities/{extra.id}", headers=admin_token_headers)

    assert response.status_code == 200
    assert session.get(City, extra.id) is None


async def test_delete_admin_city_with_events_returns_409(
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
        title="Evento",
        date=date(2999, 1, 1),
        time=time(21, 0),
        time_end=time(23, 0),
        status=EventStatus.approved,
        is_active=True,
    )
    session.add(event)
    session.commit()

    response = await client.delete(f"/api/admin/cities/{city.id}", headers=admin_token_headers)

    assert response.status_code == 409
    assert session.get(City, city.id) is not None


async def test_delete_admin_city_by_user_returns_403(
    client: AsyncClient, city: City, user_token_headers: dict[str, str]
):
    response = await client.delete(f"/api/admin/cities/{city.id}", headers=user_token_headers)

    assert response.status_code == 403


async def test_delete_admin_city_without_auth_returns_401(client: AsyncClient, city: City):
    response = await client.delete(f"/api/admin/cities/{city.id}")

    assert response.status_code == 401


async def test_delete_admin_city_nonexistent_returns_404(client: AsyncClient, admin_token_headers: dict[str, str]):
    response = await client.delete(
        "/api/admin/cities/00000000-0000-0000-0000-000000000000", headers=admin_token_headers
    )

    assert response.status_code == 404
