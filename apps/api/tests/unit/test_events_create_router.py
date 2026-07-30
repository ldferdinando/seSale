from datetime import date, timedelta
from uuid import uuid4

from httpx import AsyncClient
from sqlmodel import Session

from app.models import User


def _valid_payload(*, user_id) -> dict:
    return {
        "user_id": str(user_id),
        "title": "Show en el bar",
        "description": "Un show de prueba",
        "date": (date.today() + timedelta(days=10)).isoformat(),
        "time": "21:00:00",
        "category": "musica",
        "location_name": "El Tinglado Bar",
        "location_address": "Av. Roca 1240",
        "ticket_type": "gratis",
    }


async def test_create_event_success(client: AsyncClient, organizer: User):
    response = await client.post("/api/events", json=_valid_payload(user_id=organizer.id))

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Show en el bar"
    assert body["status"] == "pending"
    assert body["location"]["name"] == "El Tinglado Bar"


async def test_create_event_unknown_organizer_returns_404(client: AsyncClient):
    response = await client.post("/api/events", json=_valid_payload(user_id=uuid4()))

    assert response.status_code == 404


async def test_create_event_invalid_category_returns_422(client: AsyncClient, organizer: User):
    payload = _valid_payload(user_id=organizer.id)
    payload["category"] = "no-existe"

    response = await client.post("/api/events", json=payload)

    assert response.status_code == 422


async def test_create_event_missing_title_returns_422(client: AsyncClient, organizer: User):
    payload = _valid_payload(user_id=organizer.id)
    del payload["title"]

    response = await client.post("/api/events", json=payload)

    assert response.status_code == 422


async def test_create_event_past_date_returns_422(client: AsyncClient, organizer: User):
    payload = _valid_payload(user_id=organizer.id)
    payload["date"] = (date.today() - timedelta(days=1)).isoformat()

    response = await client.post("/api/events", json=payload)

    assert response.status_code == 422


async def test_create_event_organizer_without_city_returns_422(client: AsyncClient, session: Session):
    organizer_sin_ciudad = User(email="sin-ciudad@sesale.com.ar", full_name="Sin Ciudad", public_name="Sin Ciudad")
    session.add(organizer_sin_ciudad)
    session.commit()
    session.refresh(organizer_sin_ciudad)

    response = await client.post("/api/events", json=_valid_payload(user_id=organizer_sin_ciudad.id))

    assert response.status_code == 422
