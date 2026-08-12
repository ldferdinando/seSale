from datetime import date, time
from uuid import uuid4

from httpx import AsyncClient
from sqlmodel import Session

from app.core.security import create_access_token, hash_password
from app.models import City, Event, EventCategory, EventStatus, Location, User


def _make_event(session: Session, *, city: City, organizer: User, location: Location, **kwargs) -> Event:
    defaults = dict(
        title="Evento de prueba",
        date=date(2026, 6, 1),
        time=time(21, 0),
        category="musica",
        status=EventStatus.approved,
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


async def test_get_event_approved_returns_200_with_full_data(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location
):
    event = _make_event(session, city=city, organizer=organizer, location=location)

    response = await client.get(f"/api/events/{event.id}")

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Evento de prueba"
    assert body["city_name"] == city.name
    assert body["location"]["name"] == location.name
    assert body["organizer_id"] == str(organizer.id)
    assert body["organizer"]["public_name"] == organizer.public_name
    assert body["organizer"]["public_whatsapp"] == organizer.public_whatsapp
    assert body["organizer"]["city"] == city.name


async def test_get_event_pending_without_auth_returns_404(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location
):
    event = _make_event(session, city=city, organizer=organizer, location=location, status=EventStatus.pending)

    response = await client.get(f"/api/events/{event.id}")

    assert response.status_code == 404


async def test_get_event_pending_with_organizer_token_returns_200(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
):
    event = _make_event(session, city=city, organizer=organizer, location=location, status=EventStatus.pending)

    response = await client.get(f"/api/events/{event.id}", headers=user_token_headers)

    assert response.status_code == 200
    assert response.json()["status"] == "pending"


async def test_get_event_pending_with_other_users_token_returns_404(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location
):
    event = _make_event(session, city=city, organizer=organizer, location=location, status=EventStatus.pending)

    other_user = User(
        email="otro@sesale.com.ar",
        hashed_password=hash_password("Password123!"),
        full_name="Otro",
        public_name="Otro",
        city_id=city.id,
    )
    session.add(other_user)
    session.commit()
    session.refresh(other_user)
    headers = {"Authorization": f"Bearer {create_access_token(other_user.id, other_user.role)}"}

    response = await client.get(f"/api/events/{event.id}", headers=headers)

    assert response.status_code == 404


async def test_get_event_not_found_returns_404(client: AsyncClient):
    response = await client.get(f"/api/events/{uuid4()}")

    assert response.status_code == 404
