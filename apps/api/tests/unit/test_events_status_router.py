from datetime import date, time
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlmodel import Session

from app.core.config import settings
from app.models import City, Event, EventStatus, Location, User

ADMIN_KEY = "test-admin-key"


@pytest.fixture(autouse=True)
def _admin_key() -> None:
    original = settings.admin_key
    settings.admin_key = ADMIN_KEY
    yield
    settings.admin_key = original


@pytest.fixture(name="pending_event")
def pending_event_fixture(session: Session, city: City, organizer: User, location: Location) -> Event:
    event = Event(
        city_id=city.id,
        organizer_id=organizer.id,
        location_id=location.id,
        title="Evento pendiente",
        date=date(2099, 1, 1),
        time=time(21, 0),
        category="musica",
        status=EventStatus.pending,
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


async def test_approve_event_with_valid_admin_key(client: AsyncClient, pending_event: Event):
    response = await client.patch(
        f"/api/events/{pending_event.id}/status",
        json={"status": "approved"},
        headers={"x-admin-key": ADMIN_KEY},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "approved"


async def test_reject_event_with_valid_admin_key(client: AsyncClient, pending_event: Event):
    response = await client.patch(
        f"/api/events/{pending_event.id}/status",
        json={"status": "rejected"},
        headers={"x-admin-key": ADMIN_KEY},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "rejected"


async def test_update_status_without_admin_key_returns_403(client: AsyncClient, pending_event: Event):
    response = await client.patch(f"/api/events/{pending_event.id}/status", json={"status": "approved"})

    assert response.status_code == 403


async def test_update_status_with_wrong_admin_key_returns_403(client: AsyncClient, pending_event: Event):
    response = await client.patch(
        f"/api/events/{pending_event.id}/status",
        json={"status": "approved"},
        headers={"x-admin-key": "clave-incorrecta"},
    )

    assert response.status_code == 403


async def test_update_status_unknown_event_returns_404(client: AsyncClient):
    response = await client.patch(
        f"/api/events/{uuid4()}/status",
        json={"status": "approved"},
        headers={"x-admin-key": ADMIN_KEY},
    )

    assert response.status_code == 404


async def test_update_status_invalid_value_returns_422(client: AsyncClient, pending_event: Event):
    response = await client.patch(
        f"/api/events/{pending_event.id}/status",
        json={"status": "pending"},
        headers={"x-admin-key": ADMIN_KEY},
    )

    assert response.status_code == 422
