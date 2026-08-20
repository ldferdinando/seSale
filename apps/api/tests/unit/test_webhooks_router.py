import hashlib
import hmac
from datetime import date, time, timedelta

from httpx import AsyncClient
from sqlmodel import Session, select

from app.core.config import settings
from app.models.event import Event, EventStatus
from app.models.location import Location
from app.models.plan import Plan
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.city import City
from app.models.user import User
from tests.conftest import FakeMPSDK

WEBHOOK_SECRET = "test-webhook-secret"


def _signature(notification_id: str, request_id: str, ts: str = "1700000000") -> str:
    manifest = f"id:{notification_id};request-id:{request_id};ts:{ts};"
    v1 = hmac.new(WEBHOOK_SECRET.encode(), manifest.encode(), hashlib.sha256).hexdigest()
    return f"ts={ts},v1={v1}"


def _make_event(session: Session, *, city: City, organizer: User, location: Location, **kwargs) -> Event:
    defaults = dict(
        title="Show en vivo",
        date=date.today() + timedelta(days=5),
        time=time(21, 0),
        status=EventStatus.approved,
        is_active=True,
    )
    defaults.update(kwargs)
    event = Event(city_id=city.id, organizer_id=organizer.id, location_id=location.id, **defaults)
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


async def _create_pending_checkout(
    client: AsyncClient, plan_dest: Plan, event: Event, headers: dict[str, str], fake_mp_sdk: FakeMPSDK
) -> str:
    response = await client.post(
        "/api/subscriptions/checkout",
        json={"plan_id": str(plan_dest.id), "event_id": str(event.id)},
        headers=headers,
    )
    assert response.status_code == 200
    return fake_mp_sdk.last_preference_data["external_reference"]


async def test_webhook_without_signature_returns_400(monkeypatch, client: AsyncClient):
    monkeypatch.setattr(settings, "mercadopago_webhook_secret", WEBHOOK_SECRET)

    response = await client.post("/api/webhooks/mercadopago?type=payment&id=1")

    assert response.status_code == 400


async def test_webhook_with_invalid_signature_returns_400(monkeypatch, client: AsyncClient):
    monkeypatch.setattr(settings, "mercadopago_webhook_secret", WEBHOOK_SECRET)

    response = await client.post(
        "/api/webhooks/mercadopago?type=payment&id=1",
        headers={"x-signature": "ts=1700000000,v1=deadbeef", "x-request-id": "req-1"},
    )

    assert response.status_code == 400


async def test_webhook_approved_activates_subscription_and_updates_events(
    monkeypatch,
    client: AsyncClient,
    session: Session,
    organizer: User,
    location: Location,
    city: City,
    plan_dest: Plan,
    plan_price_dest,
    user_token_headers: dict[str, str],
    fake_mp_sdk: FakeMPSDK,
):
    monkeypatch.setattr(settings, "mercadopago_webhook_secret", WEBHOOK_SECRET)

    event = _make_event(session, city=city, organizer=organizer, location=location)
    external_reference = await _create_pending_checkout(client, plan_dest, event, user_token_headers, fake_mp_sdk)

    fake_mp_sdk.payment_response = {
        "id": 555,
        "status": "approved",
        "external_reference": external_reference,
        "transaction_amount": 3500,
    }

    signature = _signature("555", "req-1")
    response = await client.post(
        "/api/webhooks/mercadopago?type=payment&id=555",
        headers={"x-signature": signature, "x-request-id": "req-1"},
    )

    assert response.status_code == 200

    subscription = session.exec(
        select(Subscription).where(Subscription.mp_payment_id == "555")
    ).first()
    assert subscription is not None
    assert subscription.status == SubscriptionStatus.active
    assert subscription.event_id == event.id

    session.refresh(event)
    assert event.plan.value == "dest"
    assert event.featured_until is not None


async def test_webhook_approved_is_idempotent(
    monkeypatch,
    client: AsyncClient,
    session: Session,
    organizer: User,
    location: Location,
    city: City,
    plan_dest: Plan,
    plan_price_dest,
    user_token_headers: dict[str, str],
    fake_mp_sdk: FakeMPSDK,
):
    monkeypatch.setattr(settings, "mercadopago_webhook_secret", WEBHOOK_SECRET)
    event = _make_event(session, city=city, organizer=organizer, location=location)
    external_reference = await _create_pending_checkout(client, plan_dest, event, user_token_headers, fake_mp_sdk)

    fake_mp_sdk.payment_response = {
        "id": 777,
        "status": "approved",
        "external_reference": external_reference,
        "transaction_amount": 3500,
    }
    signature = _signature("777", "req-1")

    first = await client.post(
        "/api/webhooks/mercadopago?type=payment&id=777",
        headers={"x-signature": signature, "x-request-id": "req-1"},
    )
    second = await client.post(
        "/api/webhooks/mercadopago?type=payment&id=777",
        headers={"x-signature": signature, "x-request-id": "req-1"},
    )

    assert first.status_code == 200
    assert second.status_code == 200

    subscriptions = session.exec(
        select(Subscription).where(Subscription.user_id == organizer.id)
    ).all()
    assert len(subscriptions) == 1
    assert subscriptions[0].status == SubscriptionStatus.active


async def test_webhook_rejected_cancels_subscription(
    monkeypatch,
    client: AsyncClient,
    session: Session,
    organizer: User,
    location: Location,
    city: City,
    plan_dest: Plan,
    plan_price_dest,
    user_token_headers: dict[str, str],
    fake_mp_sdk: FakeMPSDK,
):
    monkeypatch.setattr(settings, "mercadopago_webhook_secret", WEBHOOK_SECRET)
    event = _make_event(session, city=city, organizer=organizer, location=location)
    external_reference = await _create_pending_checkout(client, plan_dest, event, user_token_headers, fake_mp_sdk)

    fake_mp_sdk.payment_response = {
        "id": 888,
        "status": "rejected",
        "external_reference": external_reference,
    }
    signature = _signature("888", "req-1")

    response = await client.post(
        "/api/webhooks/mercadopago?type=payment&id=888",
        headers={"x-signature": signature, "x-request-id": "req-1"},
    )

    assert response.status_code == 200

    subscription = session.exec(select(Subscription)).first()
    assert subscription.status == SubscriptionStatus.cancelled


async def test_webhook_unknown_topic_returns_200_without_processing(monkeypatch, client: AsyncClient):
    monkeypatch.setattr(settings, "mercadopago_webhook_secret", WEBHOOK_SECRET)
    signature = _signature("1", "req-1")

    response = await client.post(
        "/api/webhooks/mercadopago?type=merchant_order&id=1",
        headers={"x-signature": signature, "x-request-id": "req-1"},
    )

    assert response.status_code == 200


async def test_webhook_with_empty_secret_rejects_hmac_computed_with_empty_key(client: AsyncClient, monkeypatch):
    # Etapa 9c — si MERCADOPAGO_WEBHOOK_SECRET no está configurada (""), no
    # hay que aceptar una firma calculada con esa misma clave vacía (que
    # cualquiera puede reproducir).
    monkeypatch.setattr(settings, "mercadopago_webhook_secret", "")
    manifest = "id:1;request-id:req-1;ts:1700000000;"
    v1_with_empty_secret = hmac.new(b"", manifest.encode(), hashlib.sha256).hexdigest()

    response = await client.post(
        "/api/webhooks/mercadopago?type=payment&id=1",
        headers={"x-signature": f"ts=1700000000,v1={v1_with_empty_secret}", "x-request-id": "req-1"},
    )

    assert response.status_code == 400


async def test_webhook_rate_limited_after_60_requests_per_minute(monkeypatch, client: AsyncClient):
    # Etapa 9c — rate limiting en el webhook de MercadoPago.
    monkeypatch.setattr(settings, "mercadopago_webhook_secret", WEBHOOK_SECRET)

    for _ in range(60):
        response = await client.post("/api/webhooks/mercadopago?type=payment&id=1")
        assert response.status_code == 400  # sin firma, pero no rate-limited todavía

    response = await client.post("/api/webhooks/mercadopago?type=payment&id=1")

    assert response.status_code == 429
