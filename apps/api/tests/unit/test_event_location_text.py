"""Dirección libre (`Event.location_text`, migración 0034): tercer camino
para la ubicación de un evento, sin crear ni vincular ningún Location.
Mutuamente excluyente con location_id/location_data."""

from datetime import date, time, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.models import City, Event, EventCategory, EventStatus, Location, User


def _payload(**location: object) -> dict:
    return {
        "title": "Peña en la casa de Marta",
        "date": (date.today() + timedelta(days=10)).isoformat(),
        "time": "21:00:00",
        "time_end": "23:30:00",
        "categories": ["musica"],
        "ticket_type": "gratis",
        **location,
    }


def _make_text_event(session: Session, *, city: City, organizer: User, **kwargs) -> Event:
    defaults = dict(
        title="Evento con dirección libre",
        date=date.today() + timedelta(days=5),
        time=time(21, 0),
        time_end=time(23, 0),
        status=EventStatus.approved,
        is_active=True,
        location_text="Mitre 1234, General Roca",
    )
    defaults.update(kwargs)
    event = Event(city_id=city.id, organizer_id=organizer.id, **defaults)
    session.add(event)
    session.commit()
    session.refresh(event)
    session.add(EventCategory(event_id=event.id, category="musica"))
    session.commit()
    return event


# ── Alta ──────────────────────────────────────────────────────────────────


async def test_create_event_with_location_text_only_returns_201(
    client: AsyncClient, session: Session, organizer: User, user_token_headers: dict[str, str]
):
    response = await client.post(
        "/api/events", json=_payload(location_text="  Mitre 1234, General Roca  "), headers=user_token_headers
    )

    assert response.status_code == 201
    body = response.json()
    assert body["location_text"] == "Mitre 1234, General Roca"
    assert body["location_id"] is None
    assert body["location"] is None
    # No se crea ningún Location.
    assert session.exec(select(Location)).all() == []


async def test_create_event_with_location_text_and_location_id_returns_422(
    client: AsyncClient, location: Location, organizer: User, user_token_headers: dict[str, str]
):
    response = await client.post(
        "/api/events",
        json=_payload(location_text="Mitre 1234", location_id=str(location.id)),
        headers=user_token_headers,
    )

    assert response.status_code == 422


async def test_create_event_with_location_text_and_location_data_returns_422(
    client: AsyncClient, city: City, organizer: User, user_token_headers: dict[str, str]
):
    response = await client.post(
        "/api/events",
        json=_payload(
            location_text="Mitre 1234",
            location_data={"name": "Lugar", "address": "Mitre 1234", "city_id": str(city.id)},
        ),
        headers=user_token_headers,
    )

    assert response.status_code == 422


async def test_create_event_without_any_location_returns_422(
    client: AsyncClient, organizer: User, user_token_headers: dict[str, str]
):
    response = await client.post("/api/events", json=_payload(), headers=user_token_headers)

    assert response.status_code == 422


@pytest.mark.parametrize("blank", ["", "   "])
async def test_create_event_with_blank_location_text_counts_as_missing(
    client: AsyncClient, organizer: User, user_token_headers: dict[str, str], blank: str
):
    response = await client.post("/api/events", json=_payload(location_text=blank), headers=user_token_headers)

    assert response.status_code == 422


async def test_create_event_with_too_long_location_text_returns_422(
    client: AsyncClient, organizer: User, user_token_headers: dict[str, str]
):
    response = await client.post("/api/events", json=_payload(location_text="x" * 501), headers=user_token_headers)

    assert response.status_code == 422


# ── Edición ───────────────────────────────────────────────────────────────


async def test_update_event_to_location_text_unlinks_location(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
):
    event = _make_text_event(session, city=city, organizer=organizer, location_text=None, location_id=location.id)

    response = await client.put(
        f"/api/events/{event.id}", json={"location_text": "Tucumán 500"}, headers=user_token_headers
    )

    assert response.status_code == 200
    body = response.json()
    assert body["location_text"] == "Tucumán 500"
    assert body["location_id"] is None
    assert body["location"] is None
    # El Location no se borra (puede tener otros eventos).
    assert session.get(Location, location.id) is not None


async def test_update_event_from_location_text_to_location_id_clears_text(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
):
    event = _make_text_event(session, city=city, organizer=organizer)

    response = await client.put(
        f"/api/events/{event.id}", json={"location_id": str(location.id)}, headers=user_token_headers
    )

    assert response.status_code == 200
    body = response.json()
    assert body["location_text"] is None
    assert body["location"]["id"] == str(location.id)


async def test_update_event_from_location_text_to_location_data_clears_text(
    client: AsyncClient, session: Session, city: City, organizer: User, user_token_headers: dict[str, str]
):
    event = _make_text_event(session, city=city, organizer=organizer)

    response = await client.put(
        f"/api/events/{event.id}",
        json={
            "location_data": {
                "name": "Casa de Marta",
                "address": "Mitre 1234",
                "city_id": str(city.id),
                "latitude": -39.03,
                "longitude": -67.58,
            }
        },
        headers=user_token_headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["location_text"] is None
    assert body["location"]["name"] == "Casa de Marta"


async def test_update_event_with_location_text_and_location_id_returns_422(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
):
    event = _make_text_event(session, city=city, organizer=organizer)

    response = await client.put(
        f"/api/events/{event.id}",
        json={"location_text": "Otra", "location_id": str(location.id)},
        headers=user_token_headers,
    )

    assert response.status_code == 422


async def test_update_event_without_location_fields_keeps_location_text(
    client: AsyncClient, session: Session, city: City, organizer: User, user_token_headers: dict[str, str]
):
    event = _make_text_event(session, city=city, organizer=organizer)

    response = await client.put(f"/api/events/{event.id}", json={"title": "Nuevo título"}, headers=user_token_headers)

    assert response.status_code == 200
    assert response.json()["location_text"] == "Mitre 1234, General Roca"


# ── Lectura: listados y detalle no asumen que siempre hay Location ─────────


async def test_get_event_detail_with_location_text(
    client: AsyncClient, session: Session, city: City, organizer: User
):
    event = _make_text_event(session, city=city, organizer=organizer)

    response = await client.get(f"/api/events/{event.id}")

    assert response.status_code == 200
    body = response.json()
    assert body["location"] is None
    assert body["location_text"] == "Mitre 1234, General Roca"


async def test_list_public_events_includes_location_text_events(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location
):
    _make_text_event(session, city=city, organizer=organizer, title="Con dirección libre")
    _make_text_event(session, city=city, organizer=organizer, title="Con lugar", location_text=None, location_id=location.id)

    response = await client.get("/api/events", params={"city_id": str(city.id)})

    assert response.status_code == 200
    by_title = {e["title"]: e for e in response.json()}
    assert by_title["Con dirección libre"]["location"] is None
    assert by_title["Con lugar"]["location"]["id"] == str(location.id)


async def test_list_public_events_search_and_location_filter_with_location_text_events(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location
):
    """La rama "lugar" de la búsqueda y el filtro ?location_id= no rompen
    con eventos sin Location (simplemente no los matchean)."""
    _make_text_event(session, city=city, organizer=organizer, title="Peña folclórica")

    search = await client.get("/api/events", params={"search": "Peña"})
    by_place = await client.get("/api/events", params={"search": location.name})
    filtered = await client.get("/api/events", params={"location_id": str(location.id)})

    assert search.status_code == 200
    assert [e["title"] for e in search.json()] == ["Peña folclórica"]
    assert by_place.status_code == 200
    assert by_place.json() == []
    assert filtered.status_code == 200
    assert filtered.json() == []


async def test_mine_and_admin_list_with_location_text_events(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    user_token_headers: dict[str, str],
    admin_token_headers: dict[str, str],
):
    _make_text_event(session, city=city, organizer=organizer)

    mine = await client.get("/api/events/mine", headers=user_token_headers)
    admin = await client.get("/api/admin/events", headers=admin_token_headers)

    assert mine.status_code == 200
    assert mine.json()["approved"][0]["location_text"] == "Mitre 1234, General Roca"
    assert admin.status_code == 200
    assert admin.json()[0]["location"] is None


# ── Constraint de la DB ───────────────────────────────────────────────────


def test_db_rejects_event_with_both_location_id_and_location_text(
    session: Session, city: City, organizer: User, location: Location
):
    with pytest.raises(IntegrityError):
        _make_text_event(session, city=city, organizer=organizer, location_id=location.id)


def test_db_rejects_event_without_location_id_nor_location_text(session: Session, city: City, organizer: User):
    with pytest.raises(IntegrityError):
        _make_text_event(session, city=city, organizer=organizer, location_text=None)
