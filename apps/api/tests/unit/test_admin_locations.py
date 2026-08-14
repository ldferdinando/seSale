from httpx import AsyncClient
from sqlmodel import Session

from app.models import City, Event, EventStatus, Location, User


async def _make_location(session: Session, *, city: City, **overrides) -> Location:
    defaults = dict(name="El Tinglado Bar", address="Av. Roca 1240", city_id=city.id)
    defaults.update(overrides)
    location = Location(**defaults)
    session.add(location)
    session.commit()
    session.refresh(location)
    return location


async def test_post_admin_location_by_admin_forces_is_public(
    client: AsyncClient, city: City, admin_token_headers: dict[str, str]
):
    payload = {"name": "Nuevo lugar", "address": "Calle Falsa 123", "city_id": str(city.id), "is_verified": True}

    response = await client.post("/api/admin/locations", json=payload, headers=admin_token_headers)

    assert response.status_code == 201
    body = response.json()
    assert body["is_public"] is True
    assert body["is_verified"] is True
    assert body["event_count"] == 0


async def test_post_admin_location_by_user_returns_403(
    client: AsyncClient, city: City, user_token_headers: dict[str, str]
):
    payload = {"name": "Nuevo lugar", "address": "Calle Falsa 123", "city_id": str(city.id)}

    response = await client.post("/api/admin/locations", json=payload, headers=user_token_headers)

    assert response.status_code == 403


async def test_post_admin_location_without_auth_returns_401(client: AsyncClient, city: City):
    payload = {"name": "Nuevo lugar", "address": "Calle Falsa 123", "city_id": str(city.id)}

    response = await client.post("/api/admin/locations", json=payload)

    assert response.status_code == 401


async def test_put_admin_location_edits_fields_including_is_public(
    client: AsyncClient, session: Session, city: City, admin_token_headers: dict[str, str]
):
    location = await _make_location(session, city=city, is_public=False)

    response = await client.put(
        f"/api/admin/locations/{location.id}",
        json={"description": "Nueva descripción", "is_public": True},
        headers=admin_token_headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["description"] == "Nueva descripción"
    assert body["is_public"] is True


async def test_put_admin_location_unknown_id_returns_404(client: AsyncClient, admin_token_headers: dict[str, str]):
    response = await client.put(
        "/api/admin/locations/00000000-0000-0000-0000-000000000000",
        json={"description": "x"},
        headers=admin_token_headers,
    )

    assert response.status_code == 404


async def test_patch_admin_location_verify_toggles_is_verified(
    client: AsyncClient, session: Session, city: City, admin_token_headers: dict[str, str]
):
    location = await _make_location(session, city=city, is_verified=False)

    response = await client.patch(
        f"/api/admin/locations/{location.id}/verify",
        json={"is_verified": True},
        headers=admin_token_headers,
    )

    assert response.status_code == 200
    assert response.json()["is_verified"] is True

    response = await client.patch(
        f"/api/admin/locations/{location.id}/verify",
        json={"is_verified": False},
        headers=admin_token_headers,
    )

    assert response.json()["is_verified"] is False


async def test_delete_admin_location_with_events_returns_409(
    client: AsyncClient, session: Session, city: City, organizer: User, admin_token_headers: dict[str, str]
):
    location = await _make_location(session, city=city)
    event = Event(
        city_id=city.id,
        organizer_id=organizer.id,
        location_id=location.id,
        title="Evento con lugar",
        date=__import__("datetime").date.today(),
        time=__import__("datetime").time(21, 0),
        status=EventStatus.approved,
    )
    session.add(event)
    session.commit()

    response = await client.delete(f"/api/admin/locations/{location.id}", headers=admin_token_headers)

    assert response.status_code == 409
    assert "evento" in response.json()["detail"].lower()


async def test_delete_admin_location_without_events_succeeds(
    client: AsyncClient, session: Session, city: City, admin_token_headers: dict[str, str]
):
    location = await _make_location(session, city=city)

    response = await client.delete(f"/api/admin/locations/{location.id}", headers=admin_token_headers)

    assert response.status_code == 200
    assert session.get(Location, location.id) is None


async def test_get_admin_locations_returns_public_and_private_with_event_count(
    client: AsyncClient, session: Session, city: City, organizer: User, admin_token_headers: dict[str, str]
):
    public_location = await _make_location(session, city=city, name="Público", is_public=True)
    private_location = await _make_location(session, city=city, name="Privado", is_public=False)
    event = Event(
        city_id=city.id,
        organizer_id=organizer.id,
        location_id=public_location.id,
        title="Evento",
        date=__import__("datetime").date.today(),
        time=__import__("datetime").time(21, 0),
        status=EventStatus.approved,
    )
    session.add(event)
    session.commit()

    response = await client.get("/api/admin/locations", headers=admin_token_headers)

    assert response.status_code == 200
    by_name = {loc["name"]: loc for loc in response.json()}
    assert set(by_name) == {"Público", "Privado"}
    assert by_name["Público"]["event_count"] == 1
    assert by_name["Privado"]["event_count"] == 0


async def test_get_admin_locations_requires_admin(client: AsyncClient, user_token_headers: dict[str, str]):
    response = await client.get("/api/admin/locations", headers=user_token_headers)

    assert response.status_code == 403
