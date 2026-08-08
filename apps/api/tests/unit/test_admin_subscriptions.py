from datetime import datetime, timedelta, timezone

from httpx import AsyncClient
from sqlmodel import Session

from app.models.event import Event, EventStatus
from app.models.plan import Plan
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.user import User
from tests.conftest import FakeMPSDK


async def _make_pending_subscription(
    client: AsyncClient, plan_dest: Plan, headers: dict[str, str], fake_mp_sdk: FakeMPSDK
) -> str:
    response = await client.post("/api/subscriptions/checkout", json={"plan_id": str(plan_dest.id)}, headers=headers)
    assert response.status_code == 200
    body = await client.get("/api/subscriptions/me", headers=headers)
    return body.json()[0]["id"]


async def test_get_admin_subscriptions_as_admin(
    client: AsyncClient,
    plan_dest: Plan,
    plan_price_dest,
    user_token_headers: dict[str, str],
    admin_token_headers: dict[str, str],
    fake_mp_sdk: FakeMPSDK,
):
    await _make_pending_subscription(client, plan_dest, user_token_headers, fake_mp_sdk)

    response = await client.get("/api/admin/subscriptions", headers=admin_token_headers)

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["plan_name"] == "Destacado"
    assert "user_email" in body[0]


async def test_get_admin_subscriptions_as_user_returns_403(client: AsyncClient, user_token_headers: dict[str, str]):
    response = await client.get("/api/admin/subscriptions", headers=user_token_headers)

    assert response.status_code == 403


async def test_get_admin_subscriptions_filters_by_status(
    client: AsyncClient,
    plan_dest: Plan,
    plan_price_dest,
    user_token_headers: dict[str, str],
    admin_token_headers: dict[str, str],
    fake_mp_sdk: FakeMPSDK,
):
    await _make_pending_subscription(client, plan_dest, user_token_headers, fake_mp_sdk)

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
    subscription_id = await _make_pending_subscription(client, plan_dest, user_token_headers, fake_mp_sdk)

    event = Event(
        city_id=city.id,
        organizer_id=organizer.id,
        location_id=location.id,
        title="Evento del cliente banner",
        date=(datetime.now(timezone.utc) + timedelta(days=5)).date(),
        time=datetime.now(timezone.utc).time(),
        category="musica",
        status=EventStatus.approved,
        is_active=True,
    )
    session.add(event)
    session.commit()
    session.refresh(event)

    expires_at = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    response = await client.patch(
        f"/api/admin/subscriptions/{subscription_id}/activate",
        json={"expires_at": expires_at},
        headers=admin_token_headers,
    )

    assert response.status_code == 200
    assert response.json()["status"] == "active"

    session.refresh(event)
    assert event.plan.value == "dest"
    assert event.featured_until is not None


async def test_activate_subscription_as_user_returns_403(
    client: AsyncClient,
    plan_dest: Plan,
    plan_price_dest,
    user_token_headers: dict[str, str],
    fake_mp_sdk: FakeMPSDK,
):
    subscription_id = await _make_pending_subscription(client, plan_dest, user_token_headers, fake_mp_sdk)

    response = await client.patch(
        f"/api/admin/subscriptions/{subscription_id}/activate",
        json={"expires_at": datetime.now(timezone.utc).isoformat()},
        headers=user_token_headers,
    )

    assert response.status_code == 403


async def test_expire_subscriptions_endpoint_marks_expired(
    client: AsyncClient,
    session: Session,
    organizer: User,
    admin: User,
    plan_dest: Plan,
    plan_price_dest,
    admin_token_headers: dict[str, str],
):
    now = datetime.now(timezone.utc)
    subscription = Subscription(
        user_id=organizer.id,
        plan_id=plan_dest.id,
        plan_price_id=plan_price_dest.id,
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
