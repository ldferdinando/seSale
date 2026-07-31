from datetime import date, timedelta

from httpx import AsyncClient
from sqlmodel import Session

from app.core.security import create_access_token, hash_password
from app.models import User


def _valid_payload() -> dict:
    return {
        "title": "Show en el bar",
        "description": "Un show de prueba",
        "date": (date.today() + timedelta(days=10)).isoformat(),
        "time": "21:00:00",
        "category": "musica",
        "location_name": "El Tinglado Bar",
        "location_address": "Av. Roca 1240",
        "ticket_type": "gratis",
    }


async def test_create_event_success(client: AsyncClient, organizer: User, user_token_headers: dict[str, str]):
    response = await client.post("/api/events", json=_valid_payload(), headers=user_token_headers)

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Show en el bar"
    assert body["status"] == "pending"
    assert body["location"]["name"] == "El Tinglado Bar"


async def test_create_event_without_token_returns_401(client: AsyncClient, organizer: User):
    response = await client.post("/api/events", json=_valid_payload())

    assert response.status_code == 401


async def test_create_event_invalid_category_returns_422(
    client: AsyncClient, organizer: User, user_token_headers: dict[str, str]
):
    payload = _valid_payload()
    payload["category"] = "no-existe"

    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 422


async def test_create_event_missing_title_returns_422(
    client: AsyncClient, organizer: User, user_token_headers: dict[str, str]
):
    payload = _valid_payload()
    del payload["title"]

    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 422


async def test_create_event_past_date_returns_422(
    client: AsyncClient, organizer: User, user_token_headers: dict[str, str]
):
    payload = _valid_payload()
    payload["date"] = (date.today() - timedelta(days=1)).isoformat()

    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 422


async def test_create_event_organizer_without_city_returns_422(client: AsyncClient, session: Session):
    organizer_sin_ciudad = User(
        email="sin-ciudad@sesale.com.ar",
        hashed_password=hash_password("Password123!"),
        full_name="Sin Ciudad",
        public_name="Sin Ciudad",
    )
    session.add(organizer_sin_ciudad)
    session.commit()
    session.refresh(organizer_sin_ciudad)
    headers = {"Authorization": f"Bearer {create_access_token(organizer_sin_ciudad.id, organizer_sin_ciudad.role)}"}

    response = await client.post("/api/events", json=_valid_payload(), headers=headers)

    assert response.status_code == 422
