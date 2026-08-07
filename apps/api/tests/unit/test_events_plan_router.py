from datetime import date, time
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlmodel import Session

from app.models import City, Event, EventStatus, Location, User


@pytest.fixture(name="approved_event")
def approved_event_fixture(session: Session, city: City, organizer: User, location: Location) -> Event:
    event = Event(
        city_id=city.id,
        organizer_id=organizer.id,
        location_id=location.id,
        title="Evento aprobado",
        date=date(2099, 1, 1),
        time=time(21, 0),
        category="musica",
        status=EventStatus.approved,
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


async def test_change_plan_as_admin(
    client: AsyncClient, approved_event: Event, admin_token_headers: dict[str, str]
):
    response = await client.patch(
        f"/api/events/{approved_event.id}/plan",
        json={"plan": "pro"},
        headers=admin_token_headers,
    )

    assert response.status_code == 200
    assert response.json()["plan"] == "pro"


async def test_update_plan_invalid_value_returns_422(
    client: AsyncClient, approved_event: Event, admin_token_headers: dict[str, str]
):
    response = await client.patch(
        f"/api/events/{approved_event.id}/plan",
        json={"plan": "no-existe"},
        headers=admin_token_headers,
    )

    assert response.status_code == 422


async def test_update_plan_without_token_returns_401(client: AsyncClient, approved_event: Event):
    response = await client.patch(f"/api/events/{approved_event.id}/plan", json={"plan": "dest"})

    assert response.status_code == 401


async def test_update_plan_as_non_admin_returns_403(
    client: AsyncClient, approved_event: Event, user_token_headers: dict[str, str]
):
    response = await client.patch(
        f"/api/events/{approved_event.id}/plan",
        json={"plan": "dest"},
        headers=user_token_headers,
    )

    assert response.status_code == 403


async def test_update_plan_unknown_event_returns_404(client: AsyncClient, admin_token_headers: dict[str, str]):
    response = await client.patch(
        f"/api/events/{uuid4()}/plan",
        json={"plan": "dest"},
        headers=admin_token_headers,
    )

    assert response.status_code == 404
