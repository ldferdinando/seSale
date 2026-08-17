"""Tests de app/core/expiry.py — vencimiento automático de destacados
(Etapa 8c). Antes vivían como test_expire_subscriptions_* en
tests/unit/test_payment_service.py, cuando la función se llamaba
expire_subscriptions y vivía en app/services/payment_service.py."""

from datetime import date, datetime, time, timedelta, timezone
from unittest.mock import patch

from httpx import AsyncClient
from sqlmodel import Session

from app.core.expiry import expire_overdue_subscriptions
from app.models.city import City
from app.models.event import Event, EventStatus
from app.models.location import Location
from app.models.plan import Plan, PlanPrice, PlanType
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.user import User


def _make_event(session: Session, *, organizer: User, location: Location, city: City, **kwargs) -> Event:
    defaults = dict(
        city_id=city.id,
        organizer_id=organizer.id,
        location_id=location.id,
        title="Evento de prueba",
        date=date.today() + timedelta(days=3),
        time=time(21, 0),
        status=EventStatus.approved,
        is_active=True,
        plan=PlanType.gratis,
    )
    defaults.update(kwargs)
    event = Event(**defaults)
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


def test_expire_overdue_subscriptions_marks_expired_and_reverts_event(
    session: Session, organizer: User, admin: User, city: City, location: Location, plan_dest: Plan, plan_price_dest: PlanPrice
):
    now = datetime.now(timezone.utc)
    event = _make_event(
        session,
        organizer=organizer,
        location=location,
        city=city,
        plan=PlanType.dest,
        is_featured=True,
        featured_until=now - timedelta(days=1),
    )
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

    expired = expire_overdue_subscriptions(session)

    assert len(expired) == 1
    assert expired[0].status == SubscriptionStatus.expired
    assert expired[0].reviewed_at is not None

    session.refresh(event)
    assert event.plan == PlanType.gratis
    assert event.featured_until is None
    assert event.is_featured is False


def test_expire_overdue_subscriptions_ignores_active_not_yet_expired(
    session: Session, organizer: User, plan_dest: Plan, plan_price_dest: PlanPrice
):
    now = datetime.now(timezone.utc)
    subscription = Subscription(
        user_id=organizer.id,
        plan_id=plan_dest.id,
        plan_price_id=plan_price_dest.id,
        status=SubscriptionStatus.active,
        starts_at=now,
        expires_at=now + timedelta(days=10),
        amount_paid=3500,
    )
    session.add(subscription)
    session.commit()

    expired = expire_overdue_subscriptions(session)

    assert expired == []


def test_expire_overdue_subscriptions_is_idempotent(
    session: Session, organizer: User, city: City, location: Location, plan_dest: Plan, plan_price_dest: PlanPrice
):
    now = datetime.now(timezone.utc)
    event = _make_event(
        session, organizer=organizer, location=location, city=city, plan=PlanType.dest, featured_until=now - timedelta(days=1)
    )
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

    first_run = expire_overdue_subscriptions(session)
    second_run = expire_overdue_subscriptions(session)

    assert len(first_run) == 1
    assert second_run == []


def test_expire_overdue_subscriptions_legacy_event_id_none_reverts_organizer_events(
    session: Session, organizer: User, city: City, location: Location, plan_dest: Plan, plan_price_dest: PlanPrice
):
    """Subscription previa a la Etapa 6b-2 (sin event_id) — revierte todos
    los eventos del organizador con ese plan_type, criterio legacy."""
    now = datetime.now(timezone.utc)
    event = _make_event(session, organizer=organizer, location=location, city=city, plan=PlanType.dest, is_featured=True)
    subscription = Subscription(
        user_id=organizer.id,
        plan_id=plan_dest.id,
        plan_price_id=plan_price_dest.id,
        event_id=None,
        status=SubscriptionStatus.active,
        starts_at=now - timedelta(days=31),
        expires_at=now - timedelta(days=1),
        amount_paid=3500,
    )
    session.add(subscription)
    session.commit()

    expired = expire_overdue_subscriptions(session)

    assert len(expired) == 1
    session.refresh(event)
    assert event.plan == PlanType.gratis
    assert event.is_featured is False


async def test_get_events_triggers_expire_overdue_subscriptions_in_background(client: AsyncClient):
    with patch("app.routers.events.run_expire_overdue_subscriptions_task") as mock_task:
        response = await client.get("/api/events")

    assert response.status_code == 200
    mock_task.assert_called_once()
