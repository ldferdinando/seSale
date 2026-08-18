from datetime import date, time

from httpx import AsyncClient
from sqlmodel import Session

from app.models import City, Event, EventCategory, EventStatus, Location, PlanType, User


def _make_event(session: Session, *, city: City, organizer: User, location: Location, **kwargs) -> Event:
    defaults = dict(
        title="Evento de prueba",
        date=date(2026, 6, 1),
        time=time(21, 0),
        category="musica",
        status=EventStatus.approved,
        plan=PlanType.gratis,
        is_active=True,
    )
    defaults.update(kwargs)
    category = defaults.pop("category")
    event = Event(city_id=city.id, organizer_id=organizer.id, location_id=location.id, **defaults)
    session.add(event)
    session.commit()
    session.refresh(event)
    session.add(EventCategory(event_id=event.id, category=category))
    session.commit()
    return event


async def test_get_events_returns_200_with_list(client: AsyncClient, session: Session, city, organizer, location):
    _make_event(session, city=city, organizer=organizer, location=location, date=date(2099, 1, 1))

    response = await client.get("/api/events")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["title"] == "Evento de prueba"
    assert "location" in body[0]
    assert body[0]["organizer_id"] == str(organizer.id)


async def test_get_events_returns_empty_list_when_no_matches(client: AsyncClient, session: Session, city, organizer, location):
    _make_event(session, city=city, organizer=organizer, location=location, category="musica", date=date(2099, 1, 1))

    response = await client.get("/api/events", params={"category": "teatro"})

    assert response.status_code == 200
    assert response.json() == []


async def test_get_events_filters_by_category(client: AsyncClient, session: Session, city, organizer, location):
    _make_event(session, city=city, organizer=organizer, location=location, title="musica-event", category="musica", date=date(2099, 1, 1))
    _make_event(session, city=city, organizer=organizer, location=location, title="teatro-event", category="teatro", date=date(2099, 1, 1))

    response = await client.get("/api/events", params={"category": "teatro"})

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["title"] == "teatro-event"


async def test_get_events_filters_by_location_id(client: AsyncClient, session: Session, city, organizer, location):
    other_location = Location(name="Otro lugar", address="Calle Falsa 123", city_id=city.id)
    session.add(other_location)
    session.commit()
    session.refresh(other_location)

    _make_event(session, city=city, organizer=organizer, location=location, title="en-location", date=date(2099, 1, 1))
    _make_event(session, city=city, organizer=organizer, location=other_location, title="en-otro-lugar", date=date(2099, 1, 1))

    response = await client.get("/api/events", params={"location_id": str(location.id)})

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["title"] == "en-location"


async def test_get_events_filters_by_city_id(client: AsyncClient, session: Session, organizer, location):
    city_a = City(name="General Roca", province="Río Negro", is_active=True)
    city_b = City(name="Cipolletti", province="Río Negro", is_active=True)
    session.add(city_a)
    session.add(city_b)
    session.commit()
    session.refresh(city_a)
    session.refresh(city_b)

    _make_event(session, city=city_a, organizer=organizer, location=location, title="roca-event", date=date(2099, 1, 1))
    _make_event(session, city=city_b, organizer=organizer, location=location, title="cipo-event", date=date(2099, 1, 1))

    response = await client.get("/api/events", params={"city_id": str(city_b.id)})

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["title"] == "cipo-event"


async def test_get_events_excludes_past_and_non_approved(client: AsyncClient, session: Session, city, organizer, location):
    _make_event(session, city=city, organizer=organizer, location=location, title="past", date=date(2020, 1, 1))
    _make_event(session, city=city, organizer=organizer, location=location, title="pending", status=EventStatus.pending, date=date(2099, 1, 1))
    _make_event(session, city=city, organizer=organizer, location=location, title="inactive", is_active=False, date=date(2099, 1, 1))
    _make_event(session, city=city, organizer=organizer, location=location, title="visible", date=date(2099, 1, 1))

    response = await client.get("/api/events")

    assert response.status_code == 200
    body = response.json()
    assert [e["title"] for e in body] == ["visible"]


async def test_get_events_orders_by_plan_priority(client: AsyncClient, session: Session, city, organizer, location):
    _make_event(session, city=city, organizer=organizer, location=location, title="gratis-1", plan=PlanType.gratis, date=date(2099, 1, 1))
    _make_event(session, city=city, organizer=organizer, location=location, title="pro-1", plan=PlanType.pro, date=date(2099, 1, 1))
    _make_event(session, city=city, organizer=organizer, location=location, title="dest-1", plan=PlanType.dest, date=date(2099, 1, 1))

    response = await client.get("/api/events")

    assert response.status_code == 200
    body = response.json()
    assert [e["title"] for e in body] == ["pro-1", "dest-1", "gratis-1"]


async def test_get_events_invalid_date_returns_422(client: AsyncClient):
    response = await client.get("/api/events", params={"date_from": "not-a-date"})

    assert response.status_code == 422
