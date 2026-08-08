import hashlib
import hmac
from datetime import date, datetime, time, timedelta, timezone

from sqlmodel import Session

from app.models.event import Event, EventStatus
from app.models.plan import Plan, PlanPrice, PlanType
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.user import User
from app.services.payment_service import expire_subscriptions, verify_mp_signature

SECRET = "test-secret"


def _valid_signature(notification_id: str, request_id: str, ts: str = "123") -> tuple[str, str]:
    manifest = f"id:{notification_id};request-id:{request_id};ts:{ts};"
    v1 = hmac.new(SECRET.encode(), manifest.encode(), hashlib.sha256).hexdigest()
    return f"ts={ts},v1={v1}", request_id


def test_verify_mp_signature_accepts_correct_manifest():
    header, request_id = _valid_signature("42", "req-1")

    assert verify_mp_signature(x_signature=header, x_request_id=request_id, notification_id="42", secret=SECRET)


def test_verify_mp_signature_rejects_wrong_secret():
    header, request_id = _valid_signature("42", "req-1")

    assert not verify_mp_signature(x_signature=header, x_request_id=request_id, notification_id="42", secret="otro-secret")


def test_verify_mp_signature_rejects_tampered_notification_id():
    header, request_id = _valid_signature("42", "req-1")

    assert not verify_mp_signature(x_signature=header, x_request_id=request_id, notification_id="99", secret=SECRET)


def test_verify_mp_signature_rejects_missing_signature():
    assert not verify_mp_signature(x_signature=None, x_request_id="req-1", notification_id="42", secret=SECRET)


def test_verify_mp_signature_rejects_malformed_header():
    assert not verify_mp_signature(x_signature="not-a-valid-header", x_request_id="req-1", notification_id="42", secret=SECRET)


def test_expire_subscriptions_marks_expired_and_reverts_events(session: Session, organizer: User, admin: User, city, location):
    plan = Plan(name="Destacado", plan_type=PlanType.dest, pricing_type="fixed", is_active=True)
    session.add(plan)
    session.commit()
    session.refresh(plan)

    price = PlanPrice(plan_id=plan.id, amount=3500, valid_from=date.today(), created_by=admin.id)
    session.add(price)
    session.commit()
    session.refresh(price)

    now = datetime.now(timezone.utc)
    subscription = Subscription(
        user_id=organizer.id,
        plan_id=plan.id,
        plan_price_id=price.id,
        status=SubscriptionStatus.active,
        starts_at=now - timedelta(days=31),
        expires_at=now - timedelta(days=1),
        amount_paid=3500,
    )
    session.add(subscription)

    event = Event(
        city_id=city.id,
        organizer_id=organizer.id,
        location_id=location.id,
        title="Evento con plan vencido",
        date=date.today() + timedelta(days=3),
        time=time(21, 0),
        category="musica",
        status=EventStatus.approved,
        is_active=True,
        plan=PlanType.dest,
        is_featured=True,
        featured_until=now - timedelta(days=1),
    )
    session.add(event)
    session.commit()
    session.refresh(subscription)
    session.refresh(event)

    expired = expire_subscriptions(session)

    assert len(expired) == 1
    assert expired[0].status == SubscriptionStatus.expired

    session.refresh(event)
    assert event.plan == PlanType.gratis
    assert event.featured_until is None
    assert event.is_featured is False


def test_expire_subscriptions_ignores_active_not_yet_expired(session: Session, organizer: User, admin: User):
    plan = Plan(name="Destacado", plan_type=PlanType.dest, pricing_type="fixed", is_active=True)
    session.add(plan)
    session.commit()
    session.refresh(plan)

    price = PlanPrice(plan_id=plan.id, amount=3500, valid_from=date.today(), created_by=admin.id)
    session.add(price)
    session.commit()
    session.refresh(price)

    now = datetime.now(timezone.utc)
    subscription = Subscription(
        user_id=organizer.id,
        plan_id=plan.id,
        plan_price_id=price.id,
        status=SubscriptionStatus.active,
        starts_at=now,
        expires_at=now + timedelta(days=10),
        amount_paid=3500,
    )
    session.add(subscription)
    session.commit()

    expired = expire_subscriptions(session)

    assert expired == []
