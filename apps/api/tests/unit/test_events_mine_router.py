from datetime import date, time

from httpx import AsyncClient
from sqlmodel import Session

from app.models import City, Event, EventCategory, EventStatus, Location, User


def _make_event(session: Session, *, city: City, organizer: User, location: Location, title: str, status: EventStatus) -> Event:
    event = Event(
        city_id=city.id,
        organizer_id=organizer.id,
        location_id=location.id,
        title=title,
        date=date(2099, 1, 1),
        time=time(21, 0),
        time_end=time(23, 0),
        status=status,
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    session.add(EventCategory(event_id=event.id, category="musica"))
    session.commit()
    return event


async def test_get_my_events_groups_by_status(
    client: AsyncClient,
    session: Session,
    city,
    organizer,
    location,
    user_token_headers: dict[str, str],
):
    _make_event(session, city=city, organizer=organizer, location=location, title="p", status=EventStatus.pending)
    _make_event(session, city=city, organizer=organizer, location=location, title="a", status=EventStatus.approved)
    _make_event(session, city=city, organizer=organizer, location=location, title="r", status=EventStatus.rejected)

    response = await client.get("/api/events/mine", headers=user_token_headers)

    assert response.status_code == 200
    body = response.json()
    assert [e["title"] for e in body["pending"]] == ["p"]
    assert [e["title"] for e in body["approved"]] == ["a"]
    assert [e["title"] for e in body["rejected"]] == ["r"]


async def test_get_my_events_returns_empty_groups_for_organizer_without_events(
    client: AsyncClient, organizer: User, user_token_headers: dict[str, str]
):
    response = await client.get("/api/events/mine", headers=user_token_headers)

    assert response.status_code == 200
    assert response.json() == {"pending": [], "approved": [], "rejected": []}


async def test_get_my_events_without_token_returns_401(client: AsyncClient):
    response = await client.get("/api/events/mine")

    assert response.status_code == 401
