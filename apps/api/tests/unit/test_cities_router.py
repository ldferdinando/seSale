from httpx import AsyncClient
from sqlmodel import Session

from app.models import City


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
