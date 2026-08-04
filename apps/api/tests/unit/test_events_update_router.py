from datetime import date, time

from httpx import AsyncClient
from sqlmodel import Session

from app.core.security import create_access_token, hash_password
from app.models import City, Event, EventStatus, Location, User


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
    event = Event(city_id=city.id, organizer_id=organizer.id, location_id=location.id, **defaults)
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


async def test_update_event_by_organizer_returns_200_and_resets_to_pending(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
):
    event = _make_event(session, city=city, organizer=organizer, location=location, status=EventStatus.approved)

    response = await client.put(
        f"/api/events/{event.id}", json={"title": "Título editado"}, headers=user_token_headers
    )

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Título editado"
    assert body["status"] == "pending"


async def test_update_event_by_admin_returns_200_and_keeps_status(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    location: Location,
    admin_token_headers: dict[str, str],
):
    event = _make_event(session, city=city, organizer=organizer, location=location, status=EventStatus.approved)

    response = await client.put(
        f"/api/events/{event.id}", json={"title": "Editado por admin"}, headers=admin_token_headers
    )

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Editado por admin"
    assert body["status"] == "approved"


async def test_update_event_by_other_user_returns_403(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location
):
    event = _make_event(session, city=city, organizer=organizer, location=location)

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

    response = await client.put(f"/api/events/{event.id}", json={"title": "Hackeado"}, headers=headers)

    assert response.status_code == 403


async def test_update_event_without_auth_returns_401(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location
):
    event = _make_event(session, city=city, organizer=organizer, location=location)

    response = await client.put(f"/api/events/{event.id}", json={"title": "Sin auth"})

    assert response.status_code == 401
