from httpx import AsyncClient
from sqlmodel import Session

from app.models import City, Location


async def _make_location(session: Session, *, city: City, **overrides) -> Location:
    defaults = dict(name="El Tinglado Bar", address="Av. Roca 1240", city_id=city.id, is_public=True)
    defaults.update(overrides)
    location = Location(**defaults)
    session.add(location)
    session.commit()
    session.refresh(location)
    return location


async def test_get_locations_requires_city_id(client: AsyncClient):
    response = await client.get("/api/locations")

    assert response.status_code == 422


async def test_get_locations_only_returns_public_locations(client: AsyncClient, session: Session, city: City):
    public = await _make_location(session, city=city, name="Lugar Público", is_public=True)
    await _make_location(session, city=city, name="Lugar Privado", is_public=False)

    response = await client.get("/api/locations", params={"city_id": str(city.id)})

    assert response.status_code == 200
    names = [loc["name"] for loc in response.json()]
    assert names == [public.name]


async def test_get_locations_filters_by_search_in_name_and_address(
    client: AsyncClient, session: Session, city: City
):
    await _make_location(session, city=city, name="El Tinglado Bar", address="Av. Roca 1240")
    await _make_location(session, city=city, name="Teatro Municipal", address="Isidro Lobo 750")

    response = await client.get("/api/locations", params={"city_id": str(city.id), "search": "tinglado"})

    assert response.status_code == 200
    assert [loc["name"] for loc in response.json()] == ["El Tinglado Bar"]


async def test_get_locations_filters_by_place_type(client: AsyncClient, session: Session, city: City):
    await _make_location(session, city=city, name="Bar A", place_type="bar")
    await _make_location(session, city=city, name="Teatro A", place_type="teatro")

    response = await client.get("/api/locations", params={"city_id": str(city.id), "place_type": "teatro"})

    assert response.status_code == 200
    assert [loc["name"] for loc in response.json()] == ["Teatro A"]


async def test_get_locations_orders_verified_first_then_by_name(
    client: AsyncClient, session: Session, city: City
):
    await _make_location(session, city=city, name="Zeta Bar", is_verified=False)
    await _make_location(session, city=city, name="Alfa Bar", is_verified=True)
    await _make_location(session, city=city, name="Beta Bar", is_verified=False)

    response = await client.get("/api/locations", params={"city_id": str(city.id)})

    assert [loc["name"] for loc in response.json()] == ["Alfa Bar", "Beta Bar", "Zeta Bar"]


async def test_get_location_detail_returns_private_location_too(
    client: AsyncClient, session: Session, city: City
):
    private = await _make_location(session, city=city, name="Lugar Privado", is_public=False)

    response = await client.get(f"/api/locations/{private.id}")

    assert response.status_code == 200
    assert response.json()["name"] == "Lugar Privado"


async def test_get_location_detail_404_for_unknown_id(client: AsyncClient):
    response = await client.get("/api/locations/00000000-0000-0000-0000-000000000000")

    assert response.status_code == 404
