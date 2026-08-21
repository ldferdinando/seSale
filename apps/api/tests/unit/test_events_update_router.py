from datetime import date, time, timedelta

from httpx import AsyncClient
from sqlmodel import Session

from app.core.security import create_access_token, hash_password
from app.models import City, Event, EventCategory, EventStatus, Location, User


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


async def test_update_event_city_id_alone_does_not_touch_location(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
):
    """Etapa 7a actualiza Event.city_id. Etapa 7b: la ubicación es
    independiente (location_id propio) — cambiar solo la ciudad del evento
    ya no mueve/recrea el Location, a diferencia del comportamiento viejo
    de find-or-create por nombre+dirección."""
    event = _make_event(session, city=city, organizer=organizer, location=location)
    other_city = City(name="Cipolletti", province="Río Negro", is_active=True)
    session.add(other_city)
    session.commit()
    session.refresh(other_city)

    response = await client.put(
        f"/api/events/{event.id}", json={"city_id": str(other_city.id)}, headers=user_token_headers
    )

    assert response.status_code == 200
    body = response.json()
    assert body["city_id"] == str(other_city.id)
    assert body["location"]["id"] == str(location.id)
    assert body["location"]["city_id"] == str(city.id)


async def test_update_event_location_id_changes_location(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
):
    """Etapa 7b: mandar un location_id nuevo cambia la ubicación del evento."""
    event = _make_event(session, city=city, organizer=organizer, location=location)
    other_location = Location(name="Centro Cultural Roca", address="Alsina 750", city_id=city.id)
    session.add(other_location)
    session.commit()
    session.refresh(other_location)

    response = await client.put(
        f"/api/events/{event.id}", json={"location_id": str(other_location.id)}, headers=user_token_headers
    )

    assert response.status_code == 200
    assert response.json()["location"]["id"] == str(other_location.id)


async def test_update_event_with_inactive_city_id_returns_422(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
):
    event = _make_event(session, city=city, organizer=organizer, location=location)
    inactive_city = City(name="Neuquén", province="Neuquén", is_active=False)
    session.add(inactive_city)
    session.commit()
    session.refresh(inactive_city)

    response = await client.put(
        f"/api/events/{event.id}", json={"city_id": str(inactive_city.id)}, headers=user_token_headers
    )

    assert response.status_code == 422


async def test_update_event_without_city_id_keeps_current_city(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
):
    event = _make_event(session, city=city, organizer=organizer, location=location)

    response = await client.put(
        f"/api/events/{event.id}", json={"title": "Sin tocar ciudad"}, headers=user_token_headers
    )

    assert response.status_code == 200
    assert response.json()["city_id"] == str(city.id)


# Etapa 8a — PARTE 3b: contact_whatsapp no se pisa si el payload no lo manda (o manda None)


async def test_update_event_without_contact_whatsapp_does_not_overwrite_existing(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
):
    event = _make_event(session, city=city, organizer=organizer, location=location, contact_whatsapp="5491111111111")

    response = await client.put(
        f"/api/events/{event.id}", json={"title": "Sin tocar whatsapp"}, headers=user_token_headers
    )

    assert response.status_code == 200
    assert response.json()["contact_whatsapp"] == "5491111111111"


async def test_update_event_with_explicit_null_contact_whatsapp_does_not_overwrite_existing(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
):
    event = _make_event(session, city=city, organizer=organizer, location=location, contact_whatsapp="5491111111111")

    response = await client.put(
        f"/api/events/{event.id}", json={"contact_whatsapp": None}, headers=user_token_headers
    )

    assert response.status_code == 200
    assert response.json()["contact_whatsapp"] == "5491111111111"


# Etapa 8a — PARTE 5: validación cruzada de location_data.city_id vs. city_id del evento


async def test_update_event_time_and_time_end_equal_returns_422(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
):
    event = _make_event(session, city=city, organizer=organizer, location=location)

    response = await client.put(
        f"/api/events/{event.id}",
        json={"time": "21:00:00", "time_end": "21:00:00"},
        headers=user_token_headers,
    )

    assert response.status_code == 422


async def test_update_event_time_and_time_end_coherent_returns_200(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
):
    event = _make_event(session, city=city, organizer=organizer, location=location)

    response = await client.put(
        f"/api/events/{event.id}",
        json={"time": "21:00:00", "time_end": "23:00:00"},
        headers=user_token_headers,
    )

    assert response.status_code == 200
    assert response.json()["time_end"] == "23:00:00"


async def test_update_event_only_time_end_without_time_does_not_require_coherence_check(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
):
    """Si el payload trae `time_end` sin `time`, el schema no tiene forma de
    validar coherencia contra el `time` vigente del evento (vive en la DB,
    no en el payload) — no debe fallar por eso."""
    event = _make_event(session, city=city, organizer=organizer, location=location, time=time(21, 0))

    response = await client.put(
        f"/api/events/{event.id}",
        json={"time_end": "23:45:00"},
        headers=user_token_headers,
    )

    assert response.status_code == 200
    assert response.json()["time_end"] == "23:45:00"


# Etapa 10b — date_end


async def test_update_event_date_and_date_end_and_times_coherent_returns_200(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
):
    event = _make_event(session, city=city, organizer=organizer, location=location)
    date_start = (date.today() + timedelta(days=10)).isoformat()
    date_end = (date.today() + timedelta(days=11)).isoformat()

    response = await client.put(
        f"/api/events/{event.id}",
        json={
            "date": date_start,
            "date_end": date_end,
            "time": "22:00:00",
            "time_end": "03:00:00",
        },
        headers=user_token_headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["date_end"] == date_end
    assert body["time_end"] == "03:00:00"


async def test_update_event_date_end_before_date_returns_422(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
):
    event = _make_event(session, city=city, organizer=organizer, location=location)

    response = await client.put(
        f"/api/events/{event.id}",
        json={
            "date": (date.today() + timedelta(days=11)).isoformat(),
            "date_end": (date.today() + timedelta(days=10)).isoformat(),
            "time": "21:00:00",
            "time_end": "23:00:00",
        },
        headers=user_token_headers,
    )

    assert response.status_code == 422


async def test_update_event_date_without_date_end_assumes_same_day(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
):
    """Si el payload trae `date` pero no `date_end`, se asume el mismo día
    (igual criterio que EventCreate) — un time_end "menor" que time sin
    date_end explícito no es válido."""
    event = _make_event(session, city=city, organizer=organizer, location=location)

    response = await client.put(
        f"/api/events/{event.id}",
        json={
            "date": (date.today() + timedelta(days=10)).isoformat(),
            "time": "22:00:00",
            "time_end": "03:00:00",
        },
        headers=user_token_headers,
    )

    assert response.status_code == 422


async def test_update_event_location_data_city_mismatch_returns_422(
    client: AsyncClient,
    session: Session,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
):
    event = _make_event(session, city=city, organizer=organizer, location=location)
    other_city = City(name="Cipolletti", province="Río Negro", is_active=True)
    session.add(other_city)
    session.commit()
    session.refresh(other_city)

    response = await client.put(
        f"/api/events/{event.id}",
        json={
            "location_data": {
                "name": "Lugar en otra ciudad",
                "address": "Calle Falsa 123",
                "city_id": str(other_city.id),
            }
        },
        headers=user_token_headers,
    )

    assert response.status_code == 422
