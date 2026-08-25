from datetime import date, time, timedelta

import pytest
from httpx import AsyncClient
from sqlmodel import Session

from app.core.config import settings
from app.models.city import City
from app.models.event import Event, EventStatus
from app.models.location import Location
from app.models.plan import Plan
from app.models.user import User
from tests.conftest import FakeMPSDK


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


async def test_checkout_without_token_returns_401(
    client: AsyncClient, session: Session, plan_dest: Plan, city: City, organizer: User, location: Location
):
    event = _make_event(session, city=city, organizer=organizer, location=location)
    response = await client.post(
        "/api/subscriptions/checkout", json={"plan_id": str(plan_dest.id), "event_id": str(event.id)}
    )

    assert response.status_code == 401


async def test_checkout_with_gratis_plan_returns_400(
    client: AsyncClient,
    session: Session,
    plan_gratis: Plan,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
    fake_mp_sdk: FakeMPSDK,
):
    event = _make_event(session, city=city, organizer=organizer, location=location)
    response = await client.post(
        "/api/subscriptions/checkout",
        json={"plan_id": str(plan_gratis.id), "event_id": str(event.id)},
        headers=user_token_headers,
    )

    assert response.status_code == 400


async def test_checkout_with_banner_plan_returns_400(
    client: AsyncClient,
    session: Session,
    plan_banner: Plan,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
    fake_mp_sdk: FakeMPSDK,
):
    event = _make_event(session, city=city, organizer=organizer, location=location)
    response = await client.post(
        "/api/subscriptions/checkout",
        json={"plan_id": str(plan_banner.id), "event_id": str(event.id)},
        headers=user_token_headers,
    )

    assert response.status_code == 400


async def test_checkout_with_event_from_another_organizer_returns_404(
    client: AsyncClient,
    session: Session,
    plan_dest: Plan,
    plan_price_dest,
    city: City,
    location: Location,
    user_token_headers: dict[str, str],
    fake_mp_sdk: FakeMPSDK,
):
    other_organizer = User(
        email="otro-organizador@sesale.com.ar",
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
        "/api/subscriptions/checkout",
        json={"plan_id": str(plan_dest.id), "event_id": str(event.id)},
        headers=user_token_headers,
    )

    assert response.status_code == 404


async def test_checkout_with_dest_plan_returns_init_point(
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
    response = await client.post(
        "/api/subscriptions/checkout",
        json={"plan_id": str(plan_dest.id), "event_id": str(event.id)},
        headers=user_token_headers,
    )

    assert response.status_code == 200
    assert response.json()["init_point"] == fake_mp_sdk.init_point
    assert fake_mp_sdk.last_preference_data["external_reference"]
    assert str(event.id) in fake_mp_sdk.last_preference_data["external_reference"]


async def test_checkout_with_mp_api_error_returns_502(
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
    fake_mp_sdk.preference_should_fail = True
    event = _make_event(session, city=city, organizer=organizer, location=location)

    response = await client.post(
        "/api/subscriptions/checkout",
        json={"plan_id": str(plan_dest.id), "event_id": str(event.id)},
        headers=user_token_headers,
    )

    assert response.status_code == 502


async def test_checkout_with_plan_without_price_returns_404(
    client: AsyncClient,
    session: Session,
    plan_dest: Plan,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
    fake_mp_sdk: FakeMPSDK,
):
    event = _make_event(session, city=city, organizer=organizer, location=location)
    response = await client.post(
        "/api/subscriptions/checkout",
        json={"plan_id": str(plan_dest.id), "event_id": str(event.id)},
        headers=user_token_headers,
    )

    assert response.status_code == 404


async def test_get_my_subscriptions_returns_only_own(
    client: AsyncClient,
    session: Session,
    organizer: User,
    plan_dest: Plan,
    plan_price_dest,
    city: City,
    location: Location,
    user_token_headers: dict[str, str],
    fake_mp_sdk: FakeMPSDK,
):
    event = _make_event(session, city=city, organizer=organizer, location=location)
    checkout = await client.post(
        "/api/subscriptions/checkout",
        json={"plan_id": str(plan_dest.id), "event_id": str(event.id)},
        headers=user_token_headers,
    )
    assert checkout.status_code == 200

    response = await client.get("/api/subscriptions/me", headers=user_token_headers)

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["plan_name"] == "Destacado"
    assert body[0]["status"] == "pending_payment"
    assert body[0]["event_id"] == str(event.id)
    assert body[0]["event_title"] == event.title


async def test_get_my_subscriptions_without_token_returns_401(client: AsyncClient):
    response = await client.get("/api/subscriptions/me")

    assert response.status_code == 401


async def test_checkout_without_mercadopago_configured_returns_friendly_400(
    client: AsyncClient,
    session: Session,
    monkeypatch: pytest.MonkeyPatch,
    plan_dest: Plan,
    plan_price_dest,
    city: City,
    organizer: User,
    location: Location,
    user_token_headers: dict[str, str],
):
    # Etapa 11a — BUG 2: sin MERCADOPAGO_ACCESS_TOKEN, el detalle del 400
    # debe ser el mensaje de negocio ("usá transferencia"), nunca el error
    # crudo de la SDK de MercadoPago ("Param access_token must be a String").
    monkeypatch.setattr(settings, "mercadopago_access_token", None)
    event = _make_event(session, city=city, organizer=organizer, location=location)

    response = await client.post(
        "/api/subscriptions/checkout",
        json={"plan_id": str(plan_dest.id), "event_id": str(event.id)},
        headers=user_token_headers,
    )

    assert response.status_code == 400
    assert "access_token" not in response.json()["detail"]
    assert "transferencia" in response.json()["detail"].lower()
