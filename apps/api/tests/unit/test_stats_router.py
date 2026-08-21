from datetime import date, time

from httpx import AsyncClient
from sqlmodel import Session

from app.core.security import hash_password
from app.models import City, Event, EventCategory, EventStatus, Location, PlanType, User


def _make_event(session: Session, *, city: City, organizer: User, location: Location, **kwargs) -> Event:
    defaults = dict(
        title="Evento de prueba",
        date=date(2026, 6, 1),
        time=time(21, 0),
        time_end=time(23, 0),
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


async def test_get_stats_returns_correct_counts(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location
):
    city_b = City(name="Cipolletti", province="Río Negro", is_active=True)
    session.add(city_b)
    session.commit()
    session.refresh(city_b)

    organizer_b = User(
        email="otro-organizador@sesale.com.ar",
        hashed_password=hash_password("Password123!"),
        full_name="María Gómez",
        public_name="Centro Cultural Roca",
        city_id=city_b.id,
    )
    session.add(organizer_b)
    session.commit()
    session.refresh(organizer_b)

    location_b = Location(name="Centro Cultural Roca", address="Alsina 750", city_id=city_b.id)
    session.add(location_b)
    session.commit()
    session.refresh(location_b)

    _make_event(session, city=city, organizer=organizer, location=location, title="evento-1")
    _make_event(session, city=city_b, organizer=organizer_b, location=location_b, title="evento-2")
    _make_event(session, city=city, organizer=organizer, location=location, title="pending", status=EventStatus.pending)
    _make_event(session, city=city, organizer=organizer, location=location, title="inactive", is_active=False)

    response = await client.get("/api/stats")

    assert response.status_code == 200
    body = response.json()
    assert body == {"total_events": 2, "total_organizers": 2, "total_cities": 2}


async def test_get_stats_empty_db_returns_zeros(client: AsyncClient):
    response = await client.get("/api/stats")

    assert response.status_code == 200
    assert response.json() == {"total_events": 0, "total_organizers": 0, "total_cities": 0}
