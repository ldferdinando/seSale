from datetime import date, time, timedelta
from uuid import uuid4

from httpx import AsyncClient
from sqlmodel import Session

from app.models.city import City
from app.models.event import Event, EventStatus
from app.models.location import Location
from app.models.plan import Plan
from app.models.user import User


def _make_event(session: Session, *, city: City, organizer: User, location: Location, **kwargs) -> Event:
    defaults = dict(
        title="Show en vivo",
        date=date.today() + timedelta(days=5),
        time=time(21, 0),
        time_end=time(23, 0),
        status=EventStatus.approved,
        is_active=True,
    )
    defaults.update(kwargs)
    event = Event(city_id=city.id, organizer_id=organizer.id, location_id=location.id, **defaults)
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


async def test_transfer_without_token_returns_401(client: AsyncClient, plan_dest: Plan):
    response = await client.post(
        "/api/subscriptions/transfer", json={"plan_id": str(plan_dest.id), "event_id": str(uuid4())}
    )

    assert response.status_code == 401


async def test_transfer_with_banner_plan_returns_400(
    client: AsyncClient, plan_banner: Plan, user_token_headers: dict[str, str], monkeypatch
):
    monkeypatch.setattr("app.routers.subscriptions.send_transfer_notification_to_admin", _noop_send)

    response = await client.post(
        "/api/subscriptions/transfer",
        json={"plan_id": str(plan_banner.id), "event_id": str(uuid4())},
        headers=user_token_headers,
    )

    assert response.status_code == 400


async def test_transfer_with_gratis_plan_returns_400(
    client: AsyncClient, plan_gratis: Plan, user_token_headers: dict[str, str], monkeypatch
):
    monkeypatch.setattr("app.routers.subscriptions.send_transfer_notification_to_admin", _noop_send)

    response = await client.post(
        "/api/subscriptions/transfer",
        json={"plan_id": str(plan_gratis.id), "event_id": str(uuid4())},
        headers=user_token_headers,
    )

    assert response.status_code == 400


async def test_transfer_with_unknown_plan_returns_404(client: AsyncClient, user_token_headers: dict[str, str]):
    response = await client.post(
        "/api/subscriptions/transfer",
        json={"plan_id": str(uuid4()), "event_id": str(uuid4())},
        headers=user_token_headers,
    )

    assert response.status_code == 404


async def test_transfer_with_event_from_another_organizer_returns_404(
    client: AsyncClient,
    session: Session,
    plan_dest: Plan,
    plan_price_dest,
    city: City,
    location: Location,
    user_token_headers: dict[str, str],
):
    other_organizer = User(
        email="otro-organizador-transfer@sesale.com.ar",
        hashed_password="x",
        full_name="Otro",
        public_name="Otro",
        city_id=city.id,
    )
    session.add(other_organizer)
    session.commit()
    session.refresh(other_organizer)
    event = _make_event(session, city=city, organizer=other_organizer, location=location)

    response = await client.post(
        "/api/subscriptions/transfer",
        json={"plan_id": str(plan_dest.id), "event_id": str(event.id)},
        headers=user_token_headers,
    )

    assert response.status_code == 404


async def test_transfer_with_dest_plan_returns_201(
    client: AsyncClient,
    session: Session,
    plan_dest: Plan,
    plan_price_dest,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
    monkeypatch,
):
    sent = []

    async def fake_send(**kwargs):
        sent.append(kwargs)

    monkeypatch.setattr("app.routers.subscriptions.send_transfer_notification_to_admin", fake_send)
    event = _make_event(session, city=city, organizer=organizer, location=location)

    response = await client.post(
        "/api/subscriptions/transfer",
        json={
            "plan_id": str(plan_dest.id),
            "event_id": str(event.id),
            "note": "Ya transferí, mando el comprobante por WhatsApp",
        },
        headers=user_token_headers,
    )

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "pending_approval"
    assert body["payment_method"] == "transfer"
    assert body["transfer_note"] == "Ya transferí, mando el comprobante por WhatsApp"
    assert body["event_id"] == str(event.id)
    assert len(sent) == 1
    assert sent[0]["plan_name"] == "Destacado"


async def test_transfer_with_plan_without_price_returns_404(
    client: AsyncClient,
    session: Session,
    plan_dest: Plan,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
):
    event = _make_event(session, city=city, organizer=organizer, location=location)
    response = await client.post(
        "/api/subscriptions/transfer",
        json={"plan_id": str(plan_dest.id), "event_id": str(event.id)},
        headers=user_token_headers,
    )

    assert response.status_code == 404


async def _noop_send(**kwargs) -> None:
    return None
