"""Tests de price_mode (Etapa "Modo de precio") — ver a_revisar.md.

price_mode ("fixed" | "consultar" | "ver_descripcion") solo tiene efecto
con ticket_type="pago" (no "gratis" ni "anticipo", que siempre usa montos
numéricos price_at_door/price_advance). Con "consultar"/"ver_descripcion"
no se carga price_at_door — se rechaza con 422 si vienen juntos.
"""
from datetime import date, time, timedelta

from httpx import AsyncClient
from sqlmodel import Session

from app.models import City, Event, EventCategory, EventStatus, Location, User


def _create_payload(**overrides) -> dict:
    payload = {
        "title": "Show en el bar",
        "date": (date.today() + timedelta(days=10)).isoformat(),
        "time": "21:00:00",
        "categories": ["musica"],
        "ticket_type": "pago",
    }
    payload.update(overrides)
    return payload


def _make_event(session: Session, *, city: City, organizer: User, location: Location, **kwargs) -> Event:
    defaults = dict(
        title="Evento de prueba",
        date=date(2026, 6, 1),
        time=time(21, 0),
        time_end=time(23, 0),
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


# ---------------------------------------------------------------------------
# POST /api/events — creación
# ---------------------------------------------------------------------------


async def test_create_event_default_price_mode_is_fixed(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    payload = _create_payload(location_id=str(location.id), ticket_type="gratis")
    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 201
    assert response.json()["price_mode"] == "fixed"


async def test_create_event_pago_with_fixed_price(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    payload = _create_payload(location_id=str(location.id), price_mode="fixed", price_at_door=3000)
    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 201
    body = response.json()
    assert body["price_mode"] == "fixed"
    assert body["price_at_door"] == 3000


async def test_create_event_pago_consultar_without_price(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    payload = _create_payload(location_id=str(location.id), price_mode="consultar")
    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 201
    body = response.json()
    assert body["price_mode"] == "consultar"
    assert body["price_at_door"] is None


async def test_create_event_pago_ver_descripcion_without_price(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    payload = _create_payload(location_id=str(location.id), price_mode="ver_descripcion")
    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 201
    assert response.json()["price_mode"] == "ver_descripcion"


async def test_create_event_consultar_with_price_rejected(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    payload = _create_payload(location_id=str(location.id), price_mode="consultar", price_at_door=3000)
    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 422


async def test_create_event_price_mode_consultar_with_ticket_type_gratis_rejected(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    payload = _create_payload(location_id=str(location.id), ticket_type="gratis", price_mode="consultar")
    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 422


async def test_create_event_price_mode_consultar_with_ticket_type_anticipo_rejected(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    payload = _create_payload(
        location_id=str(location.id), ticket_type="anticipo", price_mode="consultar", price_advance=2000
    )
    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 422


# ---------------------------------------------------------------------------
# PUT /api/events/{id} — edición
# ---------------------------------------------------------------------------


async def test_update_event_switch_to_consultar_clears_implicit_price(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
):
    event = _make_event(
        session, city=city, organizer=organizer, location=location, ticket_type="pago", price_at_door=3000
    )

    response = await client.put(
        f"/api/events/{event.id}",
        json={"price_mode": "consultar", "price_at_door": None},
        headers=user_token_headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["price_mode"] == "consultar"
    assert body["price_at_door"] is None


async def test_update_event_sets_consultar_without_touching_stale_stored_price_rejected(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
):
    """El evento ya tiene price_at_door=3000 guardado; el payload solo
    manda price_mode (no toca price_at_door) — se rechaza porque quedaría
    inconsistente (price_mode!=fixed con un monto numérico todavía
    vigente en la fila)."""
    event = _make_event(
        session, city=city, organizer=organizer, location=location, ticket_type="pago", price_at_door=3000
    )

    response = await client.put(
        f"/api/events/{event.id}", json={"price_mode": "consultar"}, headers=user_token_headers
    )

    assert response.status_code == 422


async def test_update_event_price_mode_consultar_against_stored_ticket_type_gratis_rejected(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
):
    event = _make_event(session, city=city, organizer=organizer, location=location, ticket_type="gratis")

    response = await client.put(
        f"/api/events/{event.id}", json={"price_mode": "consultar"}, headers=user_token_headers
    )

    assert response.status_code == 422


async def test_update_event_other_fields_unaffected_by_price_mode_default(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
):
    """Un PUT que no toca price_mode ni price_at_door no se ve afectado
    por la validación nueva (regresión: no romper ediciones normales)."""
    event = _make_event(
        session, city=city, organizer=organizer, location=location, ticket_type="gratis"
    )

    response = await client.put(
        f"/api/events/{event.id}", json={"title": "Nuevo título"}, headers=user_token_headers
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Nuevo título"
