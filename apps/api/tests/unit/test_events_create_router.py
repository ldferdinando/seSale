from datetime import date, timedelta
from unittest.mock import patch

from httpx import AsyncClient
from sqlmodel import Session

from app.core.security import create_access_token, hash_password
from app.models import City, Location, User


def _valid_payload(location_id: str) -> dict:
    return {
        "title": "Show en el bar",
        "description": "Un show de prueba",
        "date": (date.today() + timedelta(days=10)).isoformat(),
        "time": "21:00:00",
        "time_end": "23:30:00",
        "categories": ["musica"],
        "location_id": location_id,
        "ticket_type": "gratis",
    }


async def test_create_event_success(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    response = await client.post("/api/events", json=_valid_payload(str(location.id)), headers=user_token_headers)

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Show en el bar"
    assert body["status"] == "pending"
    assert body["location"]["name"] == "El Tinglado Bar"


async def test_create_event_without_token_returns_401(client: AsyncClient, organizer: User, location: Location):
    response = await client.post("/api/events", json=_valid_payload(str(location.id)))

    assert response.status_code == 401


async def test_create_event_uses_argentina_date_not_server_clock(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    """Reproduce el bug real: un evento para 'hoy en Argentina' no debe
    rechazarse aunque el reloj del servidor (UTC) ya esté un día adelante
    — algo que pasa todas las noches entre las 21:00 y las 23:59 ART."""
    fake_argentina_today = date(2026, 8, 11)
    payload = {
        "title": "Show esta noche",
        "date": fake_argentina_today.isoformat(),
        "time": "23:30:00",
        "categories": ["musica"],
        "location_id": str(location.id),
        "ticket_type": "gratis",
    }

    with patch("app.schemas.event.argentina_today", return_value=fake_argentina_today):
        response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 201


async def test_create_event_still_rejects_dates_before_argentina_today(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    fake_argentina_today = date(2026, 8, 11)
    payload = _valid_payload(str(location.id))
    payload["date"] = (fake_argentina_today - timedelta(days=1)).isoformat()

    with patch("app.schemas.event.argentina_today", return_value=fake_argentina_today):
        response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 422


async def test_create_event_invalid_category_returns_422(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    payload = _valid_payload(str(location.id))
    payload["categories"] = ["no-existe"]

    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 422


async def test_create_event_with_multiple_categories_success(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    payload = _valid_payload(str(location.id))
    payload["categories"] = ["musica", "recital", "arte"]

    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 201
    # El orden no está garantizado (tabla intermedia sin columna de orden).
    assert set(response.json()["categories"]) == {"musica", "recital", "arte"}


async def test_create_event_zero_categories_returns_422(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    payload = _valid_payload(str(location.id))
    payload["categories"] = []

    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 422


async def test_create_event_four_categories_returns_422(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    payload = _valid_payload(str(location.id))
    payload["categories"] = ["musica", "recital", "arte", "teatro"]

    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 422


async def test_create_event_duplicate_categories_returns_422(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    payload = _valid_payload(str(location.id))
    payload["categories"] = ["musica", "musica"]

    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 422


async def test_create_event_missing_title_returns_422(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    payload = _valid_payload(str(location.id))
    del payload["title"]

    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 422


async def test_create_event_past_date_returns_422(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    payload = _valid_payload(str(location.id))
    payload["date"] = (date.today() - timedelta(days=1)).isoformat()

    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 422


async def test_create_event_missing_location_returns_422(
    client: AsyncClient, organizer: User, user_token_headers: dict[str, str]
):
    """Etapa 7b: uno de los dos (location_id o location_data) es requerido."""
    payload = _valid_payload("")
    del payload["location_id"]

    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 422


async def test_create_event_with_location_data_creates_private_location(
    client: AsyncClient, session: Session, city: City, organizer: User, user_token_headers: dict[str, str]
):
    """Etapa 7b: Tab B del formulario — dirección libre crea un Location con is_public=False."""
    payload = _valid_payload("")
    del payload["location_id"]
    payload["location_data"] = {
        "name": "Nuevo lugar cargado a mano",
        "address": "Calle Falsa 123",
        "city_id": str(city.id),
        "latitude": -39.03,
        "longitude": -67.58,
    }

    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 201
    body = response.json()
    assert body["location"]["name"] == "Nuevo lugar cargado a mano"
    assert body["location"]["is_public"] is False


async def test_create_event_location_id_takes_precedence_over_location_data(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    payload = _valid_payload(str(location.id))
    payload["location_data"] = {
        "name": "Debería ignorarse",
        "address": "Otra dirección",
        "city_id": str(location.city_id),
    }

    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 201
    assert response.json()["location"]["id"] == str(location.id)


async def test_create_event_with_organizer_id_by_admin_uses_that_organizer(
    client: AsyncClient, session: Session, city, organizer: User, location: Location, admin_token_headers: dict[str, str]
):
    payload = _valid_payload(str(location.id))
    payload["organizer_id"] = str(organizer.id)

    response = await client.post("/api/events", json=payload, headers=admin_token_headers)

    assert response.status_code == 201
    assert response.json()["organizer_id"] == str(organizer.id)


async def test_create_event_with_organizer_id_by_user_is_ignored(
    client: AsyncClient,
    session: Session,
    organizer: User,
    admin: User,
    location: Location,
    user_token_headers: dict[str, str],
):
    payload = _valid_payload(str(location.id))
    payload["organizer_id"] = str(admin.id)

    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 201
    assert response.json()["organizer_id"] == str(organizer.id)


async def test_create_event_organizer_without_city_returns_422(
    client: AsyncClient, session: Session, location: Location
):
    organizer_sin_ciudad = User(
        email="sin-ciudad@sesale.com.ar",
        hashed_password=hash_password("Password123!"),
        full_name="Sin Ciudad",
        public_name="Sin Ciudad",
    )
    session.add(organizer_sin_ciudad)
    session.commit()
    session.refresh(organizer_sin_ciudad)
    headers = {"Authorization": f"Bearer {create_access_token(organizer_sin_ciudad.id, organizer_sin_ciudad.role)}"}

    response = await client.post("/api/events", json=_valid_payload(str(location.id)), headers=headers)

    assert response.status_code == 422


async def test_create_event_with_explicit_city_id_overrides_organizer_city(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    """Etapa 7a: el organizador puede publicar un evento en otra ciudad activa."""
    other_city = City(name="Cipolletti", province="Río Negro", is_active=True)
    session.add(other_city)
    session.commit()
    session.refresh(other_city)

    payload = _valid_payload(str(location.id))
    payload["city_id"] = str(other_city.id)

    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 201
    body = response.json()
    assert body["city_id"] == str(other_city.id)
    assert body["city_id"] != str(city.id)


async def test_create_event_with_inactive_city_id_returns_422(
    client: AsyncClient, session: Session, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    inactive_city = City(name="Neuquén", province="Neuquén", is_active=False)
    session.add(inactive_city)
    session.commit()
    session.refresh(inactive_city)

    payload = _valid_payload(str(location.id))
    payload["city_id"] = str(inactive_city.id)

    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 422


async def test_create_event_with_nonexistent_city_id_returns_404(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    payload = _valid_payload(str(location.id))
    payload["city_id"] = "00000000-0000-0000-0000-000000000000"

    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 404


# Etapa 8a — PARTE 5: validación cruzada de location_data.city_id vs. city_id del evento


async def test_create_event_location_data_city_mismatch_returns_422(
    client: AsyncClient, session: Session, city: City, organizer: User, user_token_headers: dict[str, str]
):
    other_city = City(name="Cipolletti", province="Río Negro", is_active=True)
    session.add(other_city)
    session.commit()
    session.refresh(other_city)

    payload = _valid_payload("")
    del payload["location_id"]
    payload["location_data"] = {
        "name": "Lugar en otra ciudad",
        "address": "Calle Falsa 123",
        "city_id": str(other_city.id),
    }
    # El evento no manda city_id explícito → usa la ciudad del organizador (`city`),
    # distinta a la de location_data (`other_city`).

    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 422


async def test_create_event_location_data_city_matches_event_city_id_succeeds(
    client: AsyncClient, session: Session, city: City, organizer: User, user_token_headers: dict[str, str]
):
    other_city = City(name="Cipolletti", province="Río Negro", is_active=True)
    session.add(other_city)
    session.commit()
    session.refresh(other_city)

    payload = _valid_payload("")
    del payload["location_id"]
    payload["city_id"] = str(other_city.id)
    payload["location_data"] = {
        "name": "Lugar en la misma ciudad del evento",
        "address": "Calle Falsa 123",
        "city_id": str(other_city.id),
    }

    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 201
    assert response.json()["city_id"] == str(other_city.id)


# Etapa 8a — PARTE 3a: contact_whatsapp se completa desde el perfil del organizador


async def test_create_event_fills_contact_whatsapp_from_organizer_profile(
    client: AsyncClient, session: Session, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    organizer.public_whatsapp = "5491122334455"
    session.add(organizer)
    session.commit()

    payload = _valid_payload(str(location.id))
    assert "contact_whatsapp" not in payload

    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 201
    assert response.json()["contact_whatsapp"] == "5491122334455"


async def test_create_event_without_organizer_whatsapp_leaves_contact_whatsapp_null(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    payload = _valid_payload(str(location.id))

    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 201
    assert response.json()["contact_whatsapp"] is None


async def test_create_event_respects_explicit_contact_whatsapp(
    client: AsyncClient, session: Session, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    organizer.public_whatsapp = "5491100000000"
    session.add(organizer)
    session.commit()

    payload = _valid_payload(str(location.id))
    payload["contact_whatsapp"] = "5491199999999"

    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 201
    assert response.json()["contact_whatsapp"] == "5491199999999"


async def test_create_event_with_plan_gratis_is_saved_as_gratis(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    payload = _valid_payload(str(location.id))
    payload["plan"] = "gratis"

    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 201
    assert response.json()["plan"] == "gratis"


async def test_create_event_with_paid_plan_is_forced_to_gratis(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    """Etapa 9b — protección server-side: sin pago confirmado, el evento
    siempre nace en plan gratis, sin importar lo que mande el frontend."""
    payload = _valid_payload(str(location.id))
    payload["plan"] = "dest"

    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 201
    assert response.json()["plan"] == "gratis"


async def test_create_event_without_plan_defaults_to_gratis(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    response = await client.post("/api/events", json=_valid_payload(str(location.id)), headers=user_token_headers)

    assert response.status_code == 201
    assert response.json()["plan"] == "gratis"


async def test_create_event_with_banner_plan_returns_422(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    payload = _valid_payload(str(location.id))
    payload["plan"] = "banner"

    response = await client.post("/api/events", json=payload, headers=user_token_headers)

    assert response.status_code == 422
