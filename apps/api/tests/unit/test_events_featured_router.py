from datetime import date, time
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlmodel import Session

from app.models import City, Event, EventCategory, EventStatus, Location, User


@pytest.fixture(name="approved_event")
def approved_event_fixture(session: Session, city: City, organizer: User, location: Location) -> Event:
    event = Event(
        city_id=city.id,
        organizer_id=organizer.id,
        location_id=location.id,
        title="Evento aprobado",
        date=date(2099, 1, 1),
        time=time(21, 0),
        status=EventStatus.approved,
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    session.add(EventCategory(event_id=event.id, category="musica"))
    session.commit()
    return event


async def test_mark_featured_as_admin_sets_is_featured_and_featured_until(
    client: AsyncClient, approved_event: Event, admin_token_headers: dict[str, str]
):
    response = await client.patch(
        f"/api/events/{approved_event.id}/featured",
        json={"is_featured": True, "featured_until": "2024-12-31T23:59:59"},
        headers=admin_token_headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["is_featured"] is True
    assert body["featured_until"].startswith("2024-12-31T23:59:59")


async def test_mark_featured_with_null_featured_until_is_indefinite(
    client: AsyncClient, approved_event: Event, admin_token_headers: dict[str, str]
):
    response = await client.patch(
        f"/api/events/{approved_event.id}/featured",
        json={"is_featured": True, "featured_until": None},
        headers=admin_token_headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["is_featured"] is True
    assert body["featured_until"] is None


async def test_update_featured_without_token_returns_401(client: AsyncClient, approved_event: Event):
    response = await client.patch(
        f"/api/events/{approved_event.id}/featured", json={"is_featured": True}
    )

    assert response.status_code == 401


async def test_update_featured_as_non_admin_returns_403(
    client: AsyncClient, approved_event: Event, user_token_headers: dict[str, str]
):
    response = await client.patch(
        f"/api/events/{approved_event.id}/featured",
        json={"is_featured": True},
        headers=user_token_headers,
    )

    assert response.status_code == 403


async def test_update_featured_unknown_event_returns_404(
    client: AsyncClient, admin_token_headers: dict[str, str]
):
    response = await client.patch(
        f"/api/events/{uuid4()}/featured",
        json={"is_featured": True},
        headers=admin_token_headers,
    )

    assert response.status_code == 404
