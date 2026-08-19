from datetime import date, time

from httpx import AsyncClient
from sqlmodel import Session

from app.models import City, Event, EventStatus, Location, User
from app.core.security import hash_password


async def test_get_admin_users_returns_all_regardless_of_role(
    client: AsyncClient,
    organizer: User,
    admin: User,
    admin_token_headers: dict[str, str],
):
    response = await client.get("/api/admin/users", headers=admin_token_headers)

    assert response.status_code == 200
    emails = [u["email"] for u in response.json()]
    assert organizer.email in emails
    assert admin.email in emails


async def test_get_admin_users_includes_inactive_users(
    client: AsyncClient,
    session: Session,
    city: City,
    admin_token_headers: dict[str, str],
):
    inactive_user = User(
        email="inactivo@sesale.com.ar",
        hashed_password=hash_password("Password123!"),
        full_name="Usuario Inactivo",
        public_name="Usuario Inactivo",
        city_id=city.id,
        is_active=False,
    )
    session.add(inactive_user)
    session.commit()

    response = await client.get("/api/admin/users", headers=admin_token_headers)

    assert response.status_code == 200
    matches = [u for u in response.json() if u["email"] == "inactivo@sesale.com.ar"]
    assert len(matches) == 1
    assert matches[0]["is_active"] is False


async def test_get_admin_users_includes_private_fields(
    client: AsyncClient,
    session: Session,
    organizer: User,
    admin_token_headers: dict[str, str],
):
    organizer.doc_type = "dni"
    organizer.doc_number = "30111222"
    organizer.phone = "+54 9 299 1234567"
    session.add(organizer)
    session.commit()

    response = await client.get("/api/admin/users", headers=admin_token_headers)

    body = next(u for u in response.json() if u["email"] == organizer.email)
    assert body["doc_type"] == "dni"
    assert body["doc_number"] == "30111222"
    assert body["phone"] == "+54 9 299 1234567"


async def test_get_admin_users_search_filters_by_name_or_email(
    client: AsyncClient, organizer: User, admin: User, admin_token_headers: dict[str, str]
):
    response = await client.get("/api/admin/users", params={"search": "Tinglado"}, headers=admin_token_headers)

    assert response.status_code == 200
    emails = [u["email"] for u in response.json()]
    assert organizer.email in emails
    assert admin.email not in emails


async def test_get_admin_users_role_filter(
    client: AsyncClient, organizer: User, admin: User, admin_token_headers: dict[str, str]
):
    response = await client.get("/api/admin/users", params={"role": "admin"}, headers=admin_token_headers)

    assert response.status_code == 200
    emails = [u["email"] for u in response.json()]
    assert admin.email in emails
    assert organizer.email not in emails


async def test_get_admin_users_as_non_admin_returns_403(client: AsyncClient, user_token_headers: dict[str, str]):
    response = await client.get("/api/admin/users", headers=user_token_headers)

    assert response.status_code == 403


async def test_get_admin_users_includes_event_count(
    client: AsyncClient,
    session: Session,
    organizer: User,
    city: City,
    location: Location,
    admin_token_headers: dict[str, str],
):
    for _ in range(2):
        session.add(
            Event(
                city_id=city.id,
                organizer_id=organizer.id,
                location_id=location.id,
                title="Evento de prueba",
                date=date(2030, 1, 1),
                time=time(20, 0),
                status=EventStatus.pending,
            )
        )
    session.commit()

    response = await client.get("/api/admin/users", headers=admin_token_headers)

    body = next(u for u in response.json() if u["email"] == organizer.email)
    assert body["event_count"] == 2


async def test_get_admin_events_filters_by_organizer_id(
    client: AsyncClient,
    session: Session,
    organizer: User,
    admin: User,
    city: City,
    location: Location,
    admin_token_headers: dict[str, str],
):
    session.add(
        Event(
            city_id=city.id,
            organizer_id=organizer.id,
            location_id=location.id,
            title="Evento del organizador",
            date=date(2030, 1, 1),
            time=time(20, 0),
            status=EventStatus.pending,
        )
    )
    session.add(
        Event(
            city_id=city.id,
            organizer_id=admin.id,
            location_id=location.id,
            title="Evento del admin",
            date=date(2030, 1, 1),
            time=time(20, 0),
            status=EventStatus.pending,
        )
    )
    session.commit()

    response = await client.get(
        "/api/admin/events", params={"organizer_id": str(organizer.id)}, headers=admin_token_headers
    )

    assert response.status_code == 200
    titles = [e["title"] for e in response.json()]
    assert titles == ["Evento del organizador"]
