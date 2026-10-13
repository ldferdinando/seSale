from datetime import date, time, timedelta
from uuid import uuid4

from httpx import AsyncClient
from sqlmodel import Session

from app.core.security import create_access_token, hash_password
from app.models import City, Event, EventCategory, Location, User


def _make_event(session: Session, *, organizer: User, location: Location, city: City) -> Event:
    event = Event(
        city_id=city.id,
        organizer_id=organizer.id,
        location_id=location.id,
        title="Evento a eliminar",
        date=date.today() + timedelta(days=5),
        time=time(21, 0),
        time_end=time(23, 0),
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    session.add(EventCategory(event_id=event.id, category="musica"))
    session.commit()
    return event


async def test_delete_event_as_admin_soft_deletes(
    client: AsyncClient,
    session: Session,
    organizer: User,
    location: Location,
    city: City,
    admin_token_headers: dict[str, str],
):
    event = _make_event(session, organizer=organizer, location=location, city=city)

    response = await client.delete(f"/api/events/{event.id}", headers=admin_token_headers)

    assert response.status_code == 204
    session.refresh(event)
    assert event.is_active is False


async def test_delete_event_as_owner_soft_deletes(
    client: AsyncClient,
    session: Session,
    organizer: User,
    location: Location,
    city: City,
    user_token_headers: dict[str, str],
):
    event = _make_event(session, organizer=organizer, location=location, city=city)

    response = await client.delete(f"/api/events/{event.id}", headers=user_token_headers)

    assert response.status_code == 204
    session.refresh(event)
    assert event.is_active is False


async def test_delete_event_as_other_user_returns_403(
    client: AsyncClient,
    session: Session,
    organizer: User,
    location: Location,
    city: City,
):
    event = _make_event(session, organizer=organizer, location=location, city=city)

    other_user = User(
        email="otro@sesale.com.ar",
        hashed_password=hash_password("Password123!"),
        full_name="Otro Usuario",
        public_name="Otro Usuario",
        city_id=city.id,
    )
    session.add(other_user)
    session.commit()
    session.refresh(other_user)
    headers = {"Authorization": f"Bearer {create_access_token(other_user.id, other_user.role)}"}

    response = await client.delete(f"/api/events/{event.id}", headers=headers)

    assert response.status_code == 403


async def test_delete_unknown_event_returns_404(client: AsyncClient, admin_token_headers: dict[str, str]):
    response = await client.delete(f"/api/events/{uuid4()}", headers=admin_token_headers)

    assert response.status_code == 404


async def test_delete_event_without_token_returns_401(client: AsyncClient):
    response = await client.delete(f"/api/events/{uuid4()}")

    assert response.status_code == 401


async def test_delete_event_twice_returns_404_second_time(
    client: AsyncClient,
    session: Session,
    organizer: User,
    location: Location,
    city: City,
    user_token_headers: dict[str, str],
):
    """Un evento ya eliminado no se puede volver a eliminar (migración 0036)."""
    event = _make_event(session, organizer=organizer, location=location, city=city)

    first = await client.delete(f"/api/events/{event.id}", headers=user_token_headers)
    second = await client.delete(f"/api/events/{event.id}", headers=user_token_headers)

    assert first.status_code == 204
    assert second.status_code == 404
    session.refresh(event)
    assert event.deleted_at is not None


async def test_deleted_event_disappears_from_admin_list_and_mine(
    client: AsyncClient,
    session: Session,
    organizer: User,
    location: Location,
    city: City,
    admin_token_headers: dict[str, str],
    user_token_headers: dict[str, str],
):
    event = _make_event(session, organizer=organizer, location=location, city=city)

    response = await client.delete(f"/api/events/{event.id}", headers=admin_token_headers)
    assert response.status_code == 204

    admin_list = await client.get("/api/admin/events", headers=admin_token_headers)
    assert all(item["id"] != str(event.id) for item in admin_list.json())

    with_deleted = await client.get("/api/admin/events?include_deleted=true", headers=admin_token_headers)
    deleted_item = next(item for item in with_deleted.json() if item["id"] == str(event.id))
    assert deleted_item["deleted_at"] is not None

    mine = await client.get("/api/events/mine", headers=user_token_headers)
    assert all(item["id"] != str(event.id) for group in mine.json().values() for item in group)

    detail = await client.get(f"/api/events/{event.id}", headers=user_token_headers)
    assert detail.status_code == 404
