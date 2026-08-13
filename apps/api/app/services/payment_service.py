"""Lógica de negocio de pagos: preferencias de MercadoPago, verificación de
firma de webhooks, activación de suscripciones y vencimiento automático.

Nunca confía en el body del webhook por sí solo: todo pago se reconfirma
contra la API de MercadoPago (`sdk.payment().get(...)`) antes de activar nada.
"""

import hashlib
import hmac
import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

import mercadopago
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from app.core.config import settings
from app.models.event import Event, EventStatus
from app.models.plan import Plan, PlanPrice, PlanType, PricingType
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.user import User

logger = logging.getLogger(__name__)

SUBSCRIPTION_DURATION_DAYS = 30
GENERIC_MP_ERROR = "No pudimos iniciar el pago con MercadoPago. Intentá de nuevo en unos minutos."


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


def _get_event_for_plan_purchase(session: Session, *, event_id: UUID, user: User) -> Event:
    """Valida el evento al que se le va a aplicar un plan pago (dest/pro).

    Etapa 6b-2: el plan se compra PARA un evento puntual, elegido por el
    organizador al momento de pagar — no para toda su cuenta. Solo el dueño
    del evento o un admin pueden comprarle un plan.
    """
    event = session.get(Event, event_id)
    if event is None or not event.is_active:
        raise LookupError("Evento no encontrado")
    if event.organizer_id != user.id and user.role != "admin":
        raise LookupError("Evento no encontrado")
    return event


def create_checkout_preference(
    session: Session, *, user: User, plan_id: UUID, event_id: UUID
) -> tuple[Subscription, str]:
    """Crea la preferencia de pago en MercadoPago y una Subscription pending_payment
    para destacar `event_id`.

    Devuelve (subscription, init_point).
    """
    plan = session.get(Plan, plan_id)
    if plan is None or not plan.is_active:
        raise LookupError("Plan no encontrado")
    if plan.plan_type in (PlanType.gratis, PlanType.banner):
        raise ValueError("Este plan no se paga a través de MercadoPago")

    event = _get_event_for_plan_purchase(session, event_id=event_id, user=user)

    price = get_current_plan_price(session, plan_id)
    if price is None:
        raise LookupError("El plan no tiene un precio vigente")

    external_reference = f"{user.id}:{plan.id}:{price.id}:{event.id}"
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
    try:
        result = sdk.preference().create(preference_data)
    except Exception:
        logger.exception("Excepción llamando a la API de MercadoPago (preference.create)")
        raise RuntimeError(GENERIC_MP_ERROR) from None

    response = result.get("response", {})
    if result.get("status", 200) >= 300 or "id" not in response or "init_point" not in response:
        logger.error("MercadoPago rechazó la creación de la preferencia: %s", response)
        raise RuntimeError(GENERIC_MP_ERROR)

    preference_id = str(response["id"])
    init_point = response["init_point"]

    now = datetime.now(timezone.utc)
    subscription = Subscription(
        user_id=user.id,
        plan_id=plan.id,
        plan_price_id=price.id,
        event_id=event.id,
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


def _parse_external_reference(external_reference: str) -> tuple[UUID, UUID, UUID, UUID | None]:
    parts = external_reference.split(":")
    user_id_str, plan_id_str, plan_price_id_str = parts[0], parts[1], parts[2]
    event_id_str = parts[3] if len(parts) > 3 else None
    return (
        UUID(user_id_str),
        UUID(plan_id_str),
        UUID(plan_price_id_str),
        UUID(event_id_str) if event_id_str else None,
    )


def _find_pending_subscription(
    session: Session, *, user_id: UUID, plan_id: UUID, plan_price_id: UUID, event_id: UUID | None
) -> Subscription | None:
    stmt = (
        select(Subscription)
        .where(Subscription.user_id == user_id)
        .where(Subscription.plan_id == plan_id)
        .where(Subscription.plan_price_id == plan_price_id)
        .where(Subscription.status == SubscriptionStatus.pending_payment)
        .order_by(Subscription.created_at.desc())
    )
    if event_id is not None:
        stmt = stmt.where(Subscription.event_id == event_id)
    return session.exec(stmt).first()


def _apply_plan_to_organizer_events(session: Session, *, user_id: UUID, plan_type: PlanType, featured_until: datetime) -> None:
    """Flujo del plan Banner únicamente (sin event_id, no es un upgrade de un
    evento puntual) — se mantiene sin cambios. Los planes dest/pro usan
    `_apply_plan_to_event` desde la Etapa 6b-2.
    """
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


def _apply_plan_to_event(session: Session, *, event_id: UUID | None, plan_type: PlanType, featured_until: datetime) -> None:
    """Etapa 6b-2: aplica el plan pagado a UN evento puntual (no a todos los
    del organizador). No exige `status == approved` — si el evento todavía
    está pendiente de moderación, igual queda con el plan asignado, listo
    para cuando se apruebe (el listado público de todos modos solo muestra
    eventos approved).
    """
    if event_id is None:
        return
    event = session.get(Event, event_id)
    if event is None or not event.is_active:
        return
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

    user_id, plan_id, plan_price_id, event_id = _parse_external_reference(payment_data["external_reference"])
    subscription = existing or _find_pending_subscription(
        session, user_id=user_id, plan_id=plan_id, plan_price_id=plan_price_id, event_id=event_id
    )

    now = datetime.now(timezone.utc)
    if subscription is None:
        price = session.get(PlanPrice, plan_price_id)
        subscription = Subscription(
            user_id=user_id,
            plan_id=plan_id,
            plan_price_id=plan_price_id,
            event_id=event_id,
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
        _apply_plan_to_event(
            session, event_id=subscription.event_id, plan_type=plan.plan_type, featured_until=subscription.expires_at
        )
        session.commit()

    return subscription


def handle_rejected_payment(session: Session, payment_data: dict) -> Subscription | None:
    external_reference = payment_data.get("external_reference")
    if not external_reference:
        return None

    user_id, plan_id, plan_price_id, event_id = _parse_external_reference(external_reference)
    subscription = _find_pending_subscription(
        session, user_id=user_id, plan_id=plan_id, plan_price_id=plan_price_id, event_id=event_id
    )
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


def get_latest_subscriptions_by_event(session: Session, event_ids: list[UUID]) -> dict[UUID, Subscription]:
    """Última Subscription (por created_at) de cada event_id — Etapa 6b-2.

    Usado para mostrar, en el contexto de un evento (detalle o listado admin),
    el estado de pago del plan comprado PARA ESE evento puntual (avisó
    transferencia, aprobado, pago de MP pendiente, etc.) sin tener que ir a
    la sección Suscripciones. Antes de la 6b-2 esto se buscaba por
    organizer_id (la última Subscription del organizador en general), lo que
    mezclaba el estado de un evento con el de cualquier otro evento no
    relacionado del mismo organizador — ver a_revisar.md. Una sola query para
    todos los event_id pedidos, evita N+1 en el listado admin de eventos.
    """
    if not event_ids:
        return {}

    stmt = (
        select(Subscription)
        .where(Subscription.event_id.in_(event_ids))
        .options(selectinload(Subscription.plan))
        .order_by(Subscription.created_at.desc())
    )
    latest: dict[UUID, Subscription] = {}
    for subscription in session.exec(stmt).all():
        if subscription.event_id is not None:
            latest.setdefault(subscription.event_id, subscription)
    return latest


def create_transfer_subscription(
    session: Session, *, user: User, plan_id: UUID, event_id: UUID, note: str | None
) -> Subscription:
    """Etapa 6b-1/6b-2: el usuario avisa que ya transfirió para destacar
    `event_id` — crea una Subscription pending_approval, sin cobrar nada acá.
    El admin la revisa y aprueba/rechaza desde el panel (`review_subscription`).
    El comprobante en sí se manda por fuera del sistema (WhatsApp/mail) — ver
    a_revisar.md, Etapa 6b-1.
    """
    plan = session.get(Plan, plan_id)
    if plan is None or not plan.is_active:
        raise LookupError("Plan no encontrado")
    # Mismo criterio que create_checkout_preference: el plan gratis no se paga
    # (nada que transferir) y el plan Banner es a convenir con el admin
    # (pricing_type=custom, no pasa por este flujo tampoco).
    if plan.plan_type in (PlanType.gratis, PlanType.banner) or plan.pricing_type != PricingType.fixed:
        raise ValueError("Este plan no admite pago por transferencia")

    event = _get_event_for_plan_purchase(session, event_id=event_id, user=user)

    price = get_current_plan_price(session, plan_id)
    if price is None:
        raise LookupError("El plan no tiene un precio vigente")

    now = datetime.now(timezone.utc)
    subscription = Subscription(
        user_id=user.id,
        plan_id=plan.id,
        plan_price_id=price.id,
        event_id=event.id,
        status=SubscriptionStatus.pending_approval,
        payment_method="transfer",
        transfer_note=note,
        starts_at=now,  # placeholder hasta que el admin apruebe, igual que create_checkout_preference
        expires_at=now,
        amount_paid=price.amount,
        currency=price.currency,
    )
    session.add(subscription)
    session.commit()
    session.refresh(subscription)
    return subscription


def review_subscription(
    session: Session, *, subscription_id: UUID, admin_id: UUID, action: str, admin_notes: str | None
) -> Subscription:
    """Etapa 6b-1: el admin aprueba o rechaza un aviso de transferencia."""
    subscription = session.get(Subscription, subscription_id)
    if subscription is None:
        raise LookupError("Suscripción no encontrada")
    if subscription.status != SubscriptionStatus.pending_approval:
        raise ValueError("La suscripción ya fue revisada")

    now = datetime.now(timezone.utc)
    subscription.approved_by = admin_id
    subscription.reviewed_at = now
    subscription.notes = admin_notes

    if action == "approve":
        subscription.status = SubscriptionStatus.active
        subscription.starts_at = now
        subscription.expires_at = now + timedelta(days=SUBSCRIPTION_DURATION_DAYS)
        session.add(subscription)
        session.commit()
        session.refresh(subscription)

        plan = session.get(Plan, subscription.plan_id)
        if plan is not None:
            _apply_plan_to_event(
                session, event_id=subscription.event_id, plan_type=plan.plan_type, featured_until=subscription.expires_at
            )
            session.commit()
    else:
        subscription.status = SubscriptionStatus.cancelled
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

        if subscription.event_id is not None:
            # Etapa 6b-2: el plan es de este evento puntual, revertir solo este.
            event = session.get(Event, subscription.event_id)
            if event is not None and event.plan == plan.plan_type:
                event.plan = PlanType.gratis
                event.featured_until = None
                event.is_featured = False
                session.add(event)
            continue

        # Sin event_id: Subscription vieja (previa a 6b-2) o del plan Banner
        # (cuenta completa, no un evento puntual) — mismo criterio de antes.
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
