from datetime import date, timedelta
from uuid import UUID

from httpx import AsyncClient
from sqlmodel import Session

from app.core.security import create_access_token, hash_password
from app.models import City, Location, User
from app.models.event import Event


def _valid_payload(location_id: str, *, days_from_today: int = 10) -> dict:
    return {
        "title": "Show en el bar",
        "description": "Un show de prueba",
        "date": (date.today() + timedelta(days=days_from_today)).isoformat(),
        "time": "21:00:00",
        "time_end": "23:30:00",
        "categories": ["musica"],
        "location_id": location_id,
        "ticket_type": "gratis",
    }


async def _create_original_event(
    client: AsyncClient, location: Location, headers: dict[str, str], **overrides
) -> dict:
    payload = {**_valid_payload(str(location.id)), **overrides}
    response = await client.post("/api/events", json=payload, headers=headers)
    assert response.status_code == 201
    return response.json()


async def test_duplicate_preserves_editable_ticket_fields(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    original = await _create_original_event(
        client,
        location,
        user_token_headers,
        ticket_type="pago",
        price_mode="consultar",
        price_at_door=None,
    )

    duplicate_payload = _valid_payload(str(location.id), days_from_today=20)
    duplicate_payload["ticket_type"] = "anticipo"
    duplicate_payload["price_mode"] = "fixed"
    duplicate_payload["price_at_door"] = 1000
    duplicate_payload["price_advance"] = 800

    response = await client.post(
        f"/api/events/{original['id']}/duplicate", json=duplicate_payload, headers=user_token_headers
    )

    assert response.status_code == 201
    body = response.json()
    assert body["ticket_type"] == "anticipo"
    assert body["price_at_door"] == 1000
    assert body["price_advance"] == 800
    assert body["id"] != original["id"]


async def test_duplicate_starts_in_pending_status(
    client: AsyncClient,
    session: Session,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
    admin_token_headers: dict[str, str],
):
    original = await _create_original_event(client, location, user_token_headers)
    # Lo aprueba el admin — la copia no debería heredar ese status.
    await client.patch(
        f"/api/events/{original['id']}/status", json={"status": "approved"}, headers=admin_token_headers
    )

    response = await client.post(
        f"/api/events/{original['id']}/duplicate",
        json=_valid_payload(str(location.id), days_from_today=20),
        headers=user_token_headers,
    )

    assert response.status_code == 201
    assert response.json()["status"] == "pending"


async def test_duplicate_does_not_modify_original_fields(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    original = await _create_original_event(client, location, user_token_headers)

    await client.post(
        f"/api/events/{original['id']}/duplicate",
        json=_valid_payload(str(location.id), days_from_today=20),
        headers=user_token_headers,
    )

    refreshed = await client.get(f"/api/events/{original['id']}", headers=user_token_headers)
    assert refreshed.status_code == 200
    body = refreshed.json()
    assert body["title"] == original["title"]
    assert body["date"] == original["date"]
    assert body["status"] == original["status"]


async def test_duplicate_always_starts_in_plan_gratis(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    original = await _create_original_event(client, location, user_token_headers)

    duplicate_payload = _valid_payload(str(location.id), days_from_today=20)
    duplicate_payload["plan"] = "pro"  # el backend lo ignora, igual que en create_event

    response = await client.post(
        f"/api/events/{original['id']}/duplicate", json=duplicate_payload, headers=user_token_headers
    )

    assert response.status_code == 201
    assert response.json()["plan"] == "gratis"


async def test_duplicating_three_times_builds_a_group_of_three_numbered_instances(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    original = await _create_original_event(client, location, user_token_headers)

    second = await client.post(
        f"/api/events/{original['id']}/duplicate",
        json=_valid_payload(str(location.id), days_from_today=20),
        headers=user_token_headers,
    )
    assert second.status_code == 201
    third = await client.post(
        f"/api/events/{original['id']}/duplicate",
        json=_valid_payload(str(location.id), days_from_today=30),
        headers=user_token_headers,
    )
    assert third.status_code == 201

    mine = await client.get("/api/events/mine", headers=user_token_headers)
    assert mine.status_code == 200
    all_events = [*mine.json()["pending"], *mine.json()["approved"], *mine.json()["rejected"]]

    group_id = next(e["instance_group_id"] for e in all_events if e["id"] == original["id"])
    assert group_id is not None

    group_events = sorted(
        (e for e in all_events if e["instance_group_id"] == group_id), key=lambda e: e["created_at"]
    )
    assert len(group_events) == 3
    assert [e["id"] for e in group_events] == [
        original["id"],
        second.json()["id"],
        third.json()["id"],
    ]


async def test_duplicate_never_writes_to_the_original_row(
    client: AsyncClient, session: Session, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    """Bug real: la primera versión de esta feature le asignaba
    `instance_group_id` al original (UPDATE real en la fila) la primera vez
    que se duplicaba. El original NUNCA debe recibir un write — ni
    `instance_group_id` ni `updated_at` ni ningún otro campo — ver
    a_revisar.md."""
    original = await _create_original_event(client, location, user_token_headers)
    original_updated_at = original["updated_at"] if "updated_at" in original else None

    await client.post(
        f"/api/events/{original['id']}/duplicate",
        json=_valid_payload(str(location.id), days_from_today=20),
        headers=user_token_headers,
    )

    session.expire_all()
    row = session.get(Event, UUID(original["id"]))
    assert row is not None
    assert row.instance_group_id is None
    if original_updated_at is not None:
        assert row.updated_at.isoformat() == original_updated_at


async def test_never_duplicated_event_has_no_instance_group_id(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    original = await _create_original_event(client, location, user_token_headers)

    mine = await client.get("/api/events/mine", headers=user_token_headers)
    all_events = [*mine.json()["pending"], *mine.json()["approved"], *mine.json()["rejected"]]
    event = next(e for e in all_events if e["id"] == original["id"])

    assert event["instance_group_id"] is None


async def test_duplicate_by_another_organizer_returns_403(
    client: AsyncClient, session: Session, city: City, organizer: User, location: Location, user_token_headers: dict[str, str]
):
    original = await _create_original_event(client, location, user_token_headers)

    other = User(
        email="otro-organizador@sesale.com.ar",
        hashed_password=hash_password("Password123!"),
        full_name="Otro Organizador",
        public_name="Otro",
        city_id=city.id,
    )
    session.add(other)
    session.commit()
    session.refresh(other)
    other_headers = {"Authorization": f"Bearer {create_access_token(other.id, other.role)}"}

    response = await client.post(
        f"/api/events/{original['id']}/duplicate",
        json=_valid_payload(str(location.id), days_from_today=20),
        headers=other_headers,
    )

    assert response.status_code == 403


async def test_admin_can_duplicate_any_event_and_organizer_stays_original(
    client: AsyncClient, organizer: User, location: Location, user_token_headers: dict[str, str], admin_token_headers: dict[str, str]
):
    original = await _create_original_event(client, location, user_token_headers)

    response = await client.post(
        f"/api/events/{original['id']}/duplicate",
        json=_valid_payload(str(location.id), days_from_today=20),
        headers=admin_token_headers,
    )

    assert response.status_code == 201
    assert response.json()["organizer_id"] == str(organizer.id)


async def test_duplicate_unknown_event_returns_404(
    client: AsyncClient, location: Location, user_token_headers: dict[str, str]
):
    response = await client.post(
        "/api/events/00000000-0000-0000-0000-000000000000/duplicate",
        json=_valid_payload(str(location.id), days_from_today=20),
        headers=user_token_headers,
    )

    assert response.status_code == 404


async def test_duplicate_without_token_returns_401(client: AsyncClient, location: Location, organizer: User, user_token_headers: dict[str, str]):
    original_response = await client.post(
        "/api/events", json=_valid_payload(str(location.id)), headers=user_token_headers
    )
    original = original_response.json()

    response = await client.post(
        f"/api/events/{original['id']}/duplicate",
        json=_valid_payload(str(location.id), days_from_today=20),
    )

    assert response.status_code == 401
