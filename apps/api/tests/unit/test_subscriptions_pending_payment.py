"""Retomar / cambiar de medio / avisar un problema con un pago de MercadoPago
que quedó en pending_payment (el organizador cerró el checkout)."""

from datetime import date, time, timedelta
from uuid import uuid4

from httpx import AsyncClient
from sqlmodel import Session, select

from app.models.city import City
from app.models.event import Event, EventStatus
from app.models.location import Location
from app.models.plan import Plan
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.user import User
from tests.conftest import FakeMPSDK


def _make_event(session: Session, *, city: City, organizer: User, location: Location) -> Event:
    event = Event(
        city_id=city.id,
        organizer_id=organizer.id,
        location_id=location.id,
        title="Show en vivo",
        date=date.today() + timedelta(days=5),
        time=time(21, 0),
        time_end=time(23, 0),
        status=EventStatus.approved,
        is_active=True,
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


def _event_subscriptions(session: Session, event: Event) -> list[Subscription]:
    session.expire_all()
    return list(session.exec(select(Subscription).where(Subscription.event_id == event.id)).all())


async def _checkout(client: AsyncClient, plan: Plan, event: Event, headers: dict[str, str]):
    return await client.post(
        "/api/subscriptions/checkout",
        json={"plan_id": str(plan.id), "event_id": str(event.id)},
        headers=headers,
    )


def _noop_send(**kwargs) -> None:
    return None


# ── Continuar pago: regenerar preferencia sin duplicar ──────────────────────


async def test_checkout_again_reuses_pending_subscription_with_new_preference(
    client: AsyncClient,
    session: Session,
    plan_dest: Plan,
    plan_price_dest,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
    fake_mp_sdk: FakeMPSDK,
):
    event = _make_event(session, city=city, organizer=organizer, location=location)
    first = await _checkout(client, plan_dest, event, user_token_headers)
    assert first.status_code == 200
    [pending] = _event_subscriptions(session, event)
    assert pending.mp_payment_id == "pref-123"

    fake_mp_sdk.preference_id = "pref-456"
    fake_mp_sdk.init_point = "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-456"
    second = await _checkout(client, plan_dest, event, user_token_headers)

    assert second.status_code == 200
    assert second.json()["init_point"] == fake_mp_sdk.init_point
    subscriptions = _event_subscriptions(session, event)
    assert len(subscriptions) == 1
    assert subscriptions[0].id == pending.id
    assert subscriptions[0].status == SubscriptionStatus.pending_payment
    assert subscriptions[0].mp_payment_id == "pref-456"


async def test_checkout_cancels_legacy_duplicate_pending_subscriptions(
    client: AsyncClient,
    session: Session,
    plan_dest: Plan,
    plan_price_dest,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
    fake_mp_sdk: FakeMPSDK,
):
    event = _make_event(session, city=city, organizer=organizer, location=location)
    await _checkout(client, plan_dest, event, user_token_headers)
    # Duplicado "de antes del fix": otra pending_payment del mismo evento.
    session.add(
        Subscription(
            user_id=organizer.id,
            plan_id=plan_dest.id,
            plan_price_id=plan_price_dest.id,
            event_id=event.id,
            status=SubscriptionStatus.pending_payment,
            starts_at=event.created_at,
            expires_at=event.created_at,
            amount_paid=plan_price_dest.amount,
        )
    )
    session.commit()

    response = await _checkout(client, plan_dest, event, user_token_headers)

    assert response.status_code == 200
    statuses = sorted(s.status.value for s in _event_subscriptions(session, event))
    assert statuses == ["cancelled", "pending_payment"]


async def test_checkout_with_transfer_under_review_returns_409(
    client: AsyncClient,
    session: Session,
    plan_dest: Plan,
    plan_price_dest,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
    fake_mp_sdk: FakeMPSDK,
    monkeypatch,
):
    monkeypatch.setattr("app.routers.subscriptions.send_transfer_notification_to_admin", _noop_send)
    event = _make_event(session, city=city, organizer=organizer, location=location)
    await client.post(
        "/api/subscriptions/transfer",
        json={"plan_id": str(plan_dest.id), "event_id": str(event.id)},
        headers=user_token_headers,
    )

    response = await _checkout(client, plan_dest, event, user_token_headers)

    assert response.status_code == 409
    assert fake_mp_sdk.last_preference_data is None
    assert len(_event_subscriptions(session, event)) == 1


async def test_approved_webhook_activates_reused_pending_subscription(
    client: AsyncClient,
    session: Session,
    plan_dest: Plan,
    plan_price_dest,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
    fake_mp_sdk: FakeMPSDK,
):
    from app.services.payment_service import handle_approved_payment

    event = _make_event(session, city=city, organizer=organizer, location=location)
    await _checkout(client, plan_dest, event, user_token_headers)
    fake_mp_sdk.preference_id = "pref-456"
    await _checkout(client, plan_dest, event, user_token_headers)
    external_reference = fake_mp_sdk.last_preference_data["external_reference"]

    handle_approved_payment(
        session, {"id": 999, "external_reference": external_reference, "transaction_amount": plan_price_dest.amount}
    )

    [subscription] = _event_subscriptions(session, event)
    assert subscription.status == SubscriptionStatus.active
    assert subscription.mp_payment_id == "999"


# ── Cambiar a transferencia: convertir la pendiente, no duplicar ────────────


async def test_transfer_converts_pending_mercadopago_subscription(
    client: AsyncClient,
    session: Session,
    plan_dest: Plan,
    plan_price_dest,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
    fake_mp_sdk: FakeMPSDK,
    monkeypatch,
):
    sent = []
    monkeypatch.setattr("app.routers.subscriptions.send_transfer_notification_to_admin", lambda **kw: sent.append(kw))
    event = _make_event(session, city=city, organizer=organizer, location=location)
    await _checkout(client, plan_dest, event, user_token_headers)
    [pending] = _event_subscriptions(session, event)

    response = await client.post(
        "/api/subscriptions/transfer",
        json={"plan_id": str(plan_dest.id), "event_id": str(event.id), "note": "Mejor transfiero"},
        headers=user_token_headers,
    )

    assert response.status_code == 201
    assert response.json()["id"] == str(pending.id)
    [subscription] = _event_subscriptions(session, event)
    assert subscription.status == SubscriptionStatus.pending_approval
    assert subscription.payment_method == "transfer"
    assert subscription.transfer_note == "Mejor transfiero"
    assert subscription.mp_payment_id is None
    assert len(sent) == 1


async def test_transfer_twice_for_same_event_returns_409(
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
    monkeypatch.setattr("app.routers.subscriptions.send_transfer_notification_to_admin", _noop_send)
    event = _make_event(session, city=city, organizer=organizer, location=location)
    payload = {"plan_id": str(plan_dest.id), "event_id": str(event.id)}
    first = await client.post("/api/subscriptions/transfer", json=payload, headers=user_token_headers)
    second = await client.post("/api/subscriptions/transfer", json=payload, headers=user_token_headers)

    assert first.status_code == 201
    assert second.status_code == 409
    assert len(_event_subscriptions(session, event)) == 1


# ── Tuve un problema, avisanos ──────────────────────────────────────────────


async def test_payment_problem_notifies_admin_and_records_note(
    client: AsyncClient,
    session: Session,
    plan_dest: Plan,
    plan_price_dest,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
    fake_mp_sdk: FakeMPSDK,
    monkeypatch,
):
    sent = []
    monkeypatch.setattr(
        "app.routers.subscriptions.send_payment_problem_notification_to_admin", lambda **kw: sent.append(kw)
    )
    event = _make_event(session, city=city, organizer=organizer, location=location)
    await _checkout(client, plan_dest, event, user_token_headers)
    [pending] = _event_subscriptions(session, event)

    response = await client.post(
        f"/api/subscriptions/{pending.id}/payment-problem",
        json={"note": "Me rechazó la tarjeta dos veces"},
        headers=user_token_headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "pending_payment"
    assert body["problem_note"] == "Me rechazó la tarjeta dos veces"
    assert body["problem_reported_at"] is not None
    assert len(sent) == 1
    assert sent[0]["plan_name"] == "Destacado"
    assert sent[0]["event_title"] == "Show en vivo"
    assert sent[0]["problem_note"] == "Me rechazó la tarjeta dos veces"


async def test_payment_problem_without_note_is_accepted(
    client: AsyncClient,
    session: Session,
    plan_dest: Plan,
    plan_price_dest,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
    fake_mp_sdk: FakeMPSDK,
    monkeypatch,
):
    monkeypatch.setattr("app.routers.subscriptions.send_payment_problem_notification_to_admin", _noop_send)
    event = _make_event(session, city=city, organizer=organizer, location=location)
    await _checkout(client, plan_dest, event, user_token_headers)
    [pending] = _event_subscriptions(session, event)

    response = await client.post(
        f"/api/subscriptions/{pending.id}/payment-problem", json={}, headers=user_token_headers
    )

    assert response.status_code == 200
    assert response.json()["problem_note"] is None


async def test_payment_problem_without_token_returns_401(client: AsyncClient):
    response = await client.post(f"/api/subscriptions/{uuid4()}/payment-problem", json={})

    assert response.status_code == 401


async def test_payment_problem_unknown_subscription_returns_404(
    client: AsyncClient, user_token_headers: dict[str, str]
):
    response = await client.post(
        f"/api/subscriptions/{uuid4()}/payment-problem", json={}, headers=user_token_headers
    )

    assert response.status_code == 404


async def test_payment_problem_on_someone_elses_subscription_returns_404(
    client: AsyncClient,
    session: Session,
    plan_dest: Plan,
    plan_price_dest,
    city: City,
    location: Location,
    user_token_headers: dict[str, str],
):
    other = User(
        email="otro-problema@sesale.com.ar", hashed_password="x", full_name="Otro", public_name="Otro", city_id=city.id
    )
    session.add(other)
    session.commit()
    event = _make_event(session, city=city, organizer=other, location=location)
    subscription = Subscription(
        user_id=other.id,
        plan_id=plan_dest.id,
        plan_price_id=plan_price_dest.id,
        event_id=event.id,
        status=SubscriptionStatus.pending_payment,
        starts_at=event.created_at,
        expires_at=event.created_at,
        amount_paid=plan_price_dest.amount,
    )
    session.add(subscription)
    session.commit()

    response = await client.post(
        f"/api/subscriptions/{subscription.id}/payment-problem", json={}, headers=user_token_headers
    )

    assert response.status_code == 404


async def test_payment_problem_on_transfer_subscription_returns_400(
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
    monkeypatch.setattr("app.routers.subscriptions.send_transfer_notification_to_admin", _noop_send)
    event = _make_event(session, city=city, organizer=organizer, location=location)
    transfer = await client.post(
        "/api/subscriptions/transfer",
        json={"plan_id": str(plan_dest.id), "event_id": str(event.id)},
        headers=user_token_headers,
    )

    response = await client.post(
        f"/api/subscriptions/{transfer.json()['id']}/payment-problem", json={}, headers=user_token_headers
    )

    assert response.status_code == 400


async def test_payment_problem_note_too_long_returns_422(client: AsyncClient, user_token_headers: dict[str, str]):
    response = await client.post(
        f"/api/subscriptions/{uuid4()}/payment-problem", json={"note": "x" * 1001}, headers=user_token_headers
    )

    assert response.status_code == 422
