"""Lógica de negocio de pagos: preferencias de MercadoPago, verificación de
firma de webhooks, activación de suscripciones y vencimiento automático.

Nunca confía en el body del webhook por sí solo: todo pago se reconfirma
contra la API de MercadoPago (`sdk.payment().get(...)`) antes de activar nada.
"""

import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from uuid import UUID

import mercadopago
from sqlmodel import Session, select

from app.core.config import settings
from app.models.event import Event, EventStatus
from app.models.plan import Plan, PlanPrice, PlanType
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.user import User

SUBSCRIPTION_DURATION_DAYS = 30


def _get_mp_sdk() -> mercadopago.SDK:
    return mercadopago.SDK(settings.mercadopago_access_token)


def get_current_plan_price(
    session: Session, plan_id: UUID, *, today: datetime | None = None
) -> PlanPrice | None:
    """Precio vigente de un plan: valid_from <= hoy y (valid_until IS NULL o >= hoy)."""
    today_date = (today or datetime.now(timezone.utc)).date()
    stmt = (
        select(PlanPrice)
        .where(PlanPrice.plan_id == plan_id)
        .where(PlanPrice.valid_from <= today_date)
        .where((PlanPrice.valid_until.is_(None)) | (PlanPrice.valid_until >= today_date))
        .order_by(PlanPrice.valid_from.desc())
    )
    return session.exec(stmt).first()


def list_active_plans(session: Session) -> list[tuple[Plan, PlanPrice | None]]:
    plans = session.exec(select(Plan).where(Plan.is_active == True)).all()  # noqa: E712
    return [(plan, get_current_plan_price(session, plan.id)) for plan in plans]


def create_checkout_preference(session: Session, *, user: User, plan_id: UUID) -> tuple[Subscription, str]:
    """Crea la preferencia de pago en MercadoPago y una Subscription pending_payment.

    Devuelve (subscription, init_point).
    """
    plan = session.get(Plan, plan_id)
    if plan is None or not plan.is_active:
        raise LookupError("Plan no encontrado")
    if plan.plan_type in (PlanType.gratis, PlanType.banner):
        raise ValueError("Este plan no se paga a través de MercadoPago")

    price = get_current_plan_price(session, plan_id)
    if price is None:
        raise LookupError("El plan no tiene un precio vigente")

    external_reference = f"{user.id}:{plan.id}:{price.id}"
    preference_data = {
        "items": [
            {
                "title": f"{plan.name} — seSALE",
                "quantity": 1,
                "unit_price": float(price.amount),
                "currency_id": price.currency,
            }
        ],
        "back_urls": {
            "success": f"{settings.frontend_url}/planes/pago-exitoso",
            "failure": f"{settings.frontend_url}/planes/pago-fallido",
            "pending": f"{settings.frontend_url}/planes/pago-pendiente",
        },
        "auto_return": "approved",
        "notification_url": f"{settings.api_url}/api/webhooks/mercadopago",
        "external_reference": external_reference,
    }

    sdk = _get_mp_sdk()
    result = sdk.preference().create(preference_data)
    response = result["response"]
    preference_id = str(response["id"])
    init_point = response["init_point"]

    now = datetime.now(timezone.utc)
    subscription = Subscription(
        user_id=user.id,
        plan_id=plan.id,
        plan_price_id=price.id,
        status=SubscriptionStatus.pending_payment,
        starts_at=now,
        expires_at=now,
        mp_payment_id=preference_id,
        amount_paid=price.amount,
        currency=price.currency,
    )
    session.add(subscription)
    session.commit()
    session.refresh(subscription)
    return subscription, init_point


def verify_mp_signature(
    *, x_signature: str | None, x_request_id: str | None, notification_id: str | None, secret: str
) -> bool:
    """Verifica la firma HMAC-SHA256 del webhook de MercadoPago.

    x-signature trae "ts=<timestamp>,v1=<hash>". El manifest se arma como
    "id:{notification_id};request-id:{request_id};ts:{ts};" y se firma con el
    MERCADOPAGO_WEBHOOK_SECRET. Nunca procesar sin esta verificación.
    """
    if not x_signature or not notification_id:
        return False

    parts: dict[str, str] = {}
    for chunk in x_signature.split(","):
        if "=" not in chunk:
            continue
        key, _, value = chunk.partition("=")
        parts[key.strip()] = value.strip()

    ts = parts.get("ts")
    v1 = parts.get("v1")
    if not ts or not v1:
        return False

    manifest = f"id:{notification_id};request-id:{x_request_id or ''};ts:{ts};"
    expected = hmac.new(secret.encode(), manifest.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, v1)


def fetch_payment_from_mp(payment_id: str) -> dict:
    """Reconfirma el pago contra la API de MP. Nunca confiar solo en el webhook."""
    sdk = _get_mp_sdk()
    result = sdk.payment().get(payment_id)
    return result["response"]


def _parse_external_reference(external_reference: str) -> tuple[UUID, UUID, UUID]:
    user_id_str, plan_id_str, plan_price_id_str = external_reference.split(":")
    return UUID(user_id_str), UUID(plan_id_str), UUID(plan_price_id_str)


def _find_pending_subscription(
    session: Session, *, user_id: UUID, plan_id: UUID, plan_price_id: UUID
) -> Subscription | None:
    stmt = (
        select(Subscription)
        .where(Subscription.user_id == user_id)
        .where(Subscription.plan_id == plan_id)
        .where(Subscription.plan_price_id == plan_price_id)
        .where(Subscription.status == SubscriptionStatus.pending_payment)
        .order_by(Subscription.created_at.desc())
    )
    return session.exec(stmt).first()


def _apply_plan_to_organizer_events(session: Session, *, user_id: UUID, plan_type: PlanType, featured_until: datetime) -> None:
    stmt = (
        select(Event)
        .where(Event.organizer_id == user_id)
        .where(Event.status == EventStatus.approved)
        .where(Event.is_active == True)  # noqa: E712
    )
    for event in session.exec(stmt).all():
        event.plan = plan_type
        event.featured_until = featured_until
        session.add(event)


def handle_approved_payment(session: Session, payment_data: dict) -> Subscription:
    """Activa (idempotente) la Subscription correspondiente a un pago approved."""
    payment_id = str(payment_data["id"])

    existing = session.exec(
        select(Subscription).where(Subscription.mp_payment_id == payment_id)
    ).first()
    if existing is not None and existing.status == SubscriptionStatus.active:
        return existing

    user_id, plan_id, plan_price_id = _parse_external_reference(payment_data["external_reference"])
    subscription = existing or _find_pending_subscription(
        session, user_id=user_id, plan_id=plan_id, plan_price_id=plan_price_id
    )

    now = datetime.now(timezone.utc)
    if subscription is None:
        price = session.get(PlanPrice, plan_price_id)
        subscription = Subscription(
            user_id=user_id,
            plan_id=plan_id,
            plan_price_id=plan_price_id,
            status=SubscriptionStatus.pending_payment,
            starts_at=now,
            expires_at=now,
            amount_paid=price.amount if price else 0,
            currency=price.currency if price else "ARS",
        )

    subscription.status = SubscriptionStatus.active
    subscription.starts_at = now
    subscription.expires_at = now + timedelta(days=SUBSCRIPTION_DURATION_DAYS)
    subscription.mp_payment_id = payment_id
    transaction_amount = payment_data.get("transaction_amount")
    if transaction_amount is not None:
        subscription.amount_paid = int(transaction_amount)
    session.add(subscription)
    session.commit()
    session.refresh(subscription)

    plan = session.get(Plan, subscription.plan_id)
    if plan is not None:
        _apply_plan_to_organizer_events(
            session, user_id=subscription.user_id, plan_type=plan.plan_type, featured_until=subscription.expires_at
        )
        session.commit()

    return subscription


def handle_rejected_payment(session: Session, payment_data: dict) -> Subscription | None:
    external_reference = payment_data.get("external_reference")
    if not external_reference:
        return None

    user_id, plan_id, plan_price_id = _parse_external_reference(external_reference)
    subscription = _find_pending_subscription(session, user_id=user_id, plan_id=plan_id, plan_price_id=plan_price_id)
    if subscription is None:
        return None

    subscription.status = SubscriptionStatus.cancelled
    payment_id = payment_data.get("id")
    if payment_id is not None:
        subscription.mp_payment_id = str(payment_id)
    session.add(subscription)
    session.commit()
    session.refresh(subscription)
    return subscription


def activate_subscription_manually(
    session: Session, *, subscription_id: UUID, expires_at: datetime, admin_id: UUID
) -> Subscription:
    """Flujo del plan Banner: el admin carga y activa la Subscription a mano."""
    subscription = session.get(Subscription, subscription_id)
    if subscription is None:
        raise LookupError("Suscripción no encontrada")

    now = datetime.now(timezone.utc)
    subscription.status = SubscriptionStatus.active
    subscription.starts_at = now
    subscription.expires_at = expires_at
    subscription.approved_by = admin_id
    session.add(subscription)
    session.commit()
    session.refresh(subscription)

    plan = session.get(Plan, subscription.plan_id)
    if plan is not None:
        _apply_plan_to_organizer_events(
            session, user_id=subscription.user_id, plan_type=plan.plan_type, featured_until=subscription.expires_at
        )
        session.commit()

    return subscription


def expire_subscriptions(session: Session) -> list[Subscription]:
    """Marca como expired las Subscription vencidas y revierte sus eventos a gratis."""
    now = datetime.now(timezone.utc)
    stmt = (
        select(Subscription)
        .where(Subscription.status == SubscriptionStatus.active)
        .where(Subscription.expires_at < now)
    )
    expired = list(session.exec(stmt).all())

    for subscription in expired:
        subscription.status = SubscriptionStatus.expired
        session.add(subscription)

        plan = session.get(Plan, subscription.plan_id)
        if plan is None:
            continue

        events_stmt = (
            select(Event)
            .where(Event.organizer_id == subscription.user_id)
            .where(Event.plan == plan.plan_type)
        )
        for event in session.exec(events_stmt).all():
            event.plan = PlanType.gratis
            event.featured_until = None
            event.is_featured = False
            session.add(event)

    session.commit()
    for subscription in expired:
        session.refresh(subscription)
    return expired
