from datetime import datetime, timedelta, timezone

from httpx import AsyncClient
from sqlmodel import Session

from app.models.category import EventCategory
from app.models.event import Event, EventStatus
from app.models.plan import Plan
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.user import User
from tests.conftest import FakeMPSDK


def _make_event(session: Session, *, organizer: User, location, city, **kwargs) -> Event:
    defaults = dict(
        title="Evento del organizador",
        date=(datetime.now(timezone.utc) + timedelta(days=5)).date(),
        time=datetime.now(timezone.utc).time(),
        status=EventStatus.approved,
        is_active=True,
    )
    defaults.update(kwargs)
    event = Event(city_id=city.id, organizer_id=organizer.id, location_id=location.id, **defaults)
    session.add(event)
    session.commit()
    session.refresh(event)
    session.add(EventCategory(event_id=event.id, category="musica"))
    session.commit()
    return event


async def _make_pending_subscription(
    client: AsyncClient, plan_dest: Plan, event: Event, headers: dict[str, str], fake_mp_sdk: FakeMPSDK
) -> str:
    response = await client.post(
        "/api/subscriptions/checkout",
        json={"plan_id": str(plan_dest.id), "event_id": str(event.id)},
        headers=headers,
    )
    assert response.status_code == 200
    body = await client.get("/api/subscriptions/me", headers=headers)
    return body.json()[0]["id"]


async def test_get_admin_subscriptions_as_admin(
    client: AsyncClient,
    session: Session,
    organizer: User,
    location,
    city,
    plan_dest: Plan,
    plan_price_dest,
    user_token_headers: dict[str, str],
    admin_token_headers: dict[str, str],
    fake_mp_sdk: FakeMPSDK,
):
    event = _make_event(session, organizer=organizer, location=location, city=city)
    await _make_pending_subscription(client, plan_dest, event, user_token_headers, fake_mp_sdk)

    response = await client.get("/api/admin/subscriptions", headers=admin_token_headers)

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["plan_name"] == "Destacado"
    assert body[0]["event_id"] == str(event.id)
    assert "user_email" in body[0]


async def test_get_admin_subscriptions_as_user_returns_403(client: AsyncClient, user_token_headers: dict[str, str]):
    response = await client.get("/api/admin/subscriptions", headers=user_token_headers)

    assert response.status_code == 403


async def test_get_admin_subscriptions_filters_by_status(
    client: AsyncClient,
    session: Session,
    organizer: User,
    location,
    city,
    plan_dest: Plan,
    plan_price_dest,
    user_token_headers: dict[str, str],
    admin_token_headers: dict[str, str],
    fake_mp_sdk: FakeMPSDK,
):
    event = _make_event(session, organizer=organizer, location=location, city=city)
    await _make_pending_subscription(client, plan_dest, event, user_token_headers, fake_mp_sdk)

    response = await client.get(
        "/api/admin/subscriptions?status=active", headers=admin_token_headers
    )

    assert response.status_code == 200
    assert response.json() == []


async def test_activate_subscription_as_admin_updates_events(
    client: AsyncClient,
    session: Session,
    organizer: User,
    location,
    city,
    plan_dest: Plan,
    plan_price_dest,
    user_token_headers: dict[str, str],
    admin_token_headers: dict[str, str],
    fake_mp_sdk: FakeMPSDK,
):
    event = _make_event(session, organizer=organizer, location=location, city=city)
    subscription_id = await _make_pending_subscription(client, plan_dest, event, user_token_headers, fake_mp_sdk)

    expires_at = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    response = await client.patch(
        f"/api/admin/subscriptions/{subscription_id}/activate",
        json={"expires_at": expires_at},
        headers=admin_token_headers,
    )

    assert response.status_code == 200
    assert response.json()["status"] == "active"

    session.refresh(event)
    # activate_subscription_manually es el flujo de Banner (sin event_id) —
    # sigue aplicando el plan a todos los eventos aprobados del organizador.
    assert event.plan.value == "dest"
    assert event.featured_until is not None


async def test_activate_subscription_as_user_returns_403(
    client: AsyncClient,
    session: Session,
    organizer: User,
    location,
    city,
    plan_dest: Plan,
    plan_price_dest,
    user_token_headers: dict[str, str],
    fake_mp_sdk: FakeMPSDK,
):
    event = _make_event(session, organizer=organizer, location=location, city=city)
    subscription_id = await _make_pending_subscription(client, plan_dest, event, user_token_headers, fake_mp_sdk)

    response = await client.patch(
        f"/api/admin/subscriptions/{subscription_id}/activate",
        json={"expires_at": datetime.now(timezone.utc).isoformat()},
        headers=user_token_headers,
    )

    assert response.status_code == 403


async def _make_transfer_subscription(
    client: AsyncClient, plan_dest: Plan, event: Event, headers: dict[str, str], monkeypatch
) -> str:
    async def fake_send(**kwargs):
        return None

    monkeypatch.setattr("app.routers.subscriptions.send_transfer_notification_to_admin", fake_send)

    response = await client.post(
        "/api/subscriptions/transfer",
        json={"plan_id": str(plan_dest.id), "event_id": str(event.id)},
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()["id"]


async def test_review_approve_activates_and_updates_only_that_event(
    client: AsyncClient,
    session: Session,
    organizer: User,
    location,
    city,
    plan_dest: Plan,
    plan_price_dest,
    user_token_headers: dict[str, str],
    admin_token_headers: dict[str, str],
    monkeypatch,
):
    sent = []

    async def fake_approved(**kwargs):
        sent.append(kwargs)

    monkeypatch.setattr("app.routers.admin.send_subscription_approved_email", fake_approved)

    event = _make_event(session, organizer=organizer, location=location, city=city, title="Evento a destacar")
    other_event = _make_event(session, organizer=organizer, location=location, city=city, title="Otro evento, sin plan")
    subscription_id = await _make_transfer_subscription(client, plan_dest, event, user_token_headers, monkeypatch)

    response = await client.patch(
        f"/api/admin/subscriptions/{subscription_id}/review",
        json={"action": "approve", "admin_notes": "Comprobante recibido por WhatsApp, todo ok"},
        headers=admin_token_headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "active"
    assert body["starts_at"] is not None
    assert body["expires_at"] is not None
    assert len(sent) == 1

    session.refresh(event)
    assert event.plan.value == "dest"
    assert event.featured_until is not None

    # Etapa 6b-2: el pago es de ESE evento, no de toda la cuenta del organizador.
    session.refresh(other_event)
    assert other_event.plan.value == "gratis"


async def test_review_approve_already_reviewed_returns_409(
    client: AsyncClient,
    session: Session,
    organizer: User,
    location,
    city,
    plan_dest: Plan,
    plan_price_dest,
    user_token_headers: dict[str, str],
    admin_token_headers: dict[str, str],
    monkeypatch,
):
    monkeypatch.setattr("app.routers.admin.send_subscription_approved_email", _noop_email)

    event = _make_event(session, organizer=organizer, location=location, city=city)
    subscription_id = await _make_transfer_subscription(client, plan_dest, event, user_token_headers, monkeypatch)

    first = await client.patch(
        f"/api/admin/subscriptions/{subscription_id}/review",
        json={"action": "approve"},
        headers=admin_token_headers,
    )
    assert first.status_code == 200

    second = await client.patch(
        f"/api/admin/subscriptions/{subscription_id}/review",
        json={"action": "approve"},
        headers=admin_token_headers,
    )
    assert second.status_code == 409


async def test_review_reject_cancels_without_touching_events(
    client: AsyncClient,
    session: Session,
    organizer: User,
    location,
    city,
    plan_dest: Plan,
    plan_price_dest,
    user_token_headers: dict[str, str],
    admin_token_headers: dict[str, str],
    monkeypatch,
):
    monkeypatch.setattr("app.routers.admin.send_subscription_rejected_email", _noop_email)

    event = _make_event(session, organizer=organizer, location=location, city=city)
    subscription_id = await _make_transfer_subscription(client, plan_dest, event, user_token_headers, monkeypatch)

    response = await client.patch(
        f"/api/admin/subscriptions/{subscription_id}/review",
        json={"action": "reject", "admin_notes": "No encontramos el pago"},
        headers=admin_token_headers,
    )

    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"

    session.refresh(event)
    assert event.plan.value == "gratis"


async def test_review_as_user_returns_403(
    client: AsyncClient,
    session: Session,
    organizer: User,
    location,
    city,
    plan_dest: Plan,
    plan_price_dest,
    user_token_headers: dict[str, str],
    monkeypatch,
):
    event = _make_event(session, organizer=organizer, location=location, city=city)
    subscription_id = await _make_transfer_subscription(client, plan_dest, event, user_token_headers, monkeypatch)

    response = await client.patch(
        f"/api/admin/subscriptions/{subscription_id}/review",
        json={"action": "approve"},
        headers=user_token_headers,
    )

    assert response.status_code == 403


async def _noop_email(**kwargs) -> None:
    return None


async def test_expire_subscriptions_endpoint_marks_expired(
    client: AsyncClient,
    session: Session,
    organizer: User,
    location,
    city,
    plan_dest: Plan,
    plan_price_dest,
    admin_token_headers: dict[str, str],
):
    event = _make_event(session, organizer=organizer, location=location, city=city)
    event.plan = plan_dest.plan_type
    session.add(event)
    session.commit()

    now = datetime.now(timezone.utc)
    subscription = Subscription(
        user_id=organizer.id,
        plan_id=plan_dest.id,
        plan_price_id=plan_price_dest.id,
        event_id=event.id,
        status=SubscriptionStatus.active,
        starts_at=now - timedelta(days=31),
        expires_at=now - timedelta(days=1),
        amount_paid=3500,
    )
    session.add(subscription)
    session.commit()

    response = await client.post("/api/admin/subscriptions/expire", headers=admin_token_headers)

    assert response.status_code == 200
    assert response.json()["expired_count"] == 1

    session.refresh(event)
    assert event.plan.value == "gratis"
    assert event.featured_until is None
