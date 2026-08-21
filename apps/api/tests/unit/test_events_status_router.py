from datetime import date, time
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlmodel import Session

from app.models import City, Event, EventCategory, EventStatus, Location, User


@pytest.fixture(name="pending_event")
def pending_event_fixture(session: Session, city: City, organizer: User, location: Location) -> Event:
    event = Event(
        city_id=city.id,
        organizer_id=organizer.id,
        location_id=location.id,
        title="Evento pendiente",
        date=date(2099, 1, 1),
        time=time(21, 0),
        time_end=time(23, 0),
        status=EventStatus.pending,
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    session.add(EventCategory(event_id=event.id, category="musica"))
    session.commit()
    return event


async def test_approve_event_as_admin(
    client: AsyncClient, pending_event: Event, admin_token_headers: dict[str, str]
):
    response = await client.patch(
        f"/api/events/{pending_event.id}/status",
        json={"status": "approved"},
        headers=admin_token_headers,
    )

    assert response.status_code == 200
    assert response.json()["status"] == "approved"


async def test_reject_event_as_admin(
    client: AsyncClient, pending_event: Event, admin_token_headers: dict[str, str]
):
    response = await client.patch(
        f"/api/events/{pending_event.id}/status",
        json={"status": "rejected"},
        headers=admin_token_headers,
    )

    assert response.status_code == 200
    assert response.json()["status"] == "rejected"


async def test_update_status_without_token_returns_401(client: AsyncClient, pending_event: Event):
    response = await client.patch(f"/api/events/{pending_event.id}/status", json={"status": "approved"})

    assert response.status_code == 401


async def test_update_status_as_non_admin_returns_403(
    client: AsyncClient, pending_event: Event, user_token_headers: dict[str, str]
):
    response = await client.patch(
        f"/api/events/{pending_event.id}/status",
        json={"status": "approved"},
        headers=user_token_headers,
    )

    assert response.status_code == 403


async def test_update_status_unknown_event_returns_404(client: AsyncClient, admin_token_headers: dict[str, str]):
    response = await client.patch(
        f"/api/events/{uuid4()}/status",
        json={"status": "approved"},
        headers=admin_token_headers,
    )

    assert response.status_code == 404


async def test_update_status_invalid_value_returns_422(
    client: AsyncClient, pending_event: Event, admin_token_headers: dict[str, str]
):
    response = await client.patch(
        f"/api/events/{pending_event.id}/status",
        json={"status": "pending"},
        headers=admin_token_headers,
    )

    assert response.status_code == 422
