"""Vencimiento automático de planes pagos (Subscription → Event) y de
banners (AdItem).

Dos formas de disparar el mismo procesamiento:
- Manual: `POST /api/admin/subscriptions/expire` (admin) llama
  `expire_overdue_subscriptions` con la sesión del request.
- Lazy: `GET /api/events` agenda `run_expire_overdue_subscriptions_task` y
  `run_expire_overdue_ad_items_task` como BackgroundTask (Etapa 8c/8d-pre) —
  corren después de que la respuesta ya se envió, cada una con su propia
  sesión de DB, y nunca propagan errores (el cliente ya recibió su
  respuesta).
"""

import logging
from datetime import datetime, timezone

from sqlmodel import Session, select

from app.core.deps import engine
from app.models.ad_item import AdItem
from app.models.event import Event, PlanType
from app.models.plan import Plan
from app.models.subscription import Subscription, SubscriptionStatus

logger = logging.getLogger(__name__)


def expire_overdue_subscriptions(session: Session) -> list[Subscription]:
    """Marca como expired las Subscription vencidas y revierte sus eventos a gratis.

    Idempotente: solo toca Subscription con status=active y expires_at <
    ahora, así que llamarla dos veces seguidas no cambia nada en la segunda
    (las ya procesadas quedaron con status=expired y no matchean el filtro).
    """
    now = datetime.now(timezone.utc)
    stmt = (
        select(Subscription)
        .where(Subscription.status == SubscriptionStatus.active)
        .where(Subscription.expires_at < now)
    )
    expired = list(session.exec(stmt).all())

    for subscription in expired:
        subscription.status = SubscriptionStatus.expired
        subscription.reviewed_at = now
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


def run_expire_overdue_subscriptions_task() -> None:
    """Entry point para BackgroundTasks: abre su propia Session (no reusa la
    del request, que puede no seguir viva una vez enviada la respuesta) y
    nunca propaga excepciones — el cliente ya recibió su respuesta."""
    try:
        with Session(engine) as session:
            expire_overdue_subscriptions(session)
    except Exception:
        logger.exception("Fallo al procesar el vencimiento lazy de suscripciones")


def expire_overdue_ad_items(session: Session) -> list[AdItem]:
    """Marca como "expired" los AdItem activos cuya vigencia (`ends_at`) ya
    pasó. `ends_at=None` es vigente indefinidamente y nunca se toca acá.

    Idempotente: solo toca AdItem con status="active" y ends_at < hoy, así
    que llamarla dos veces seguidas no cambia nada en la segunda (los ya
    procesados quedaron con status="expired" y no matchean el filtro).
    """
    today = datetime.now(timezone.utc).date()
    stmt = (
        select(AdItem)
        .where(AdItem.status == "active")
        .where(AdItem.ends_at.is_not(None))
        .where(AdItem.ends_at < today)
    )
    expired = list(session.exec(stmt).all())

    for ad_item in expired:
        ad_item.status = "expired"
        ad_item.updated_at = datetime.now(timezone.utc)
        session.add(ad_item)

    session.commit()
    for ad_item in expired:
        session.refresh(ad_item)
    return expired


def run_expire_overdue_ad_items_task() -> None:
    """Entry point para BackgroundTasks, mismo patrón que
    `run_expire_overdue_subscriptions_task`: sesión propia, nunca propaga
    excepciones."""
    try:
        with Session(engine) as session:
            expire_overdue_ad_items(session)
    except Exception:
        logger.exception("Fallo al procesar el vencimiento lazy de banners (AdItem)")
