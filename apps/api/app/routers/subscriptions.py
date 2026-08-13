from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from app.core.config import settings
from app.core.deps import get_current_user, get_session
from app.core.email import send_transfer_notification_to_admin
from app.core.limiter import limiter
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.subscription import (
    CheckoutRequest,
    CheckoutResponse,
    SubscriptionRead,
    TransferSubscriptionRequest,
)
from app.services.payment_service import create_checkout_preference, create_transfer_subscription

router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"])


def _to_subscription_read(subscription: Subscription) -> SubscriptionRead:
    return SubscriptionRead(
        id=subscription.id,
        plan_id=subscription.plan_id,
        plan_name=subscription.plan.name,
        plan_type=subscription.plan.plan_type,
        status=subscription.status,
        payment_method=subscription.payment_method,
        starts_at=subscription.starts_at,
        expires_at=subscription.expires_at,
        amount_paid=subscription.amount_paid,
        currency=subscription.currency,
        promo_label=subscription.plan_price.promo_label if subscription.plan_price else None,
        mp_payment_id=subscription.mp_payment_id,
        transfer_note=subscription.transfer_note,
        reviewed_at=subscription.reviewed_at,
        created_at=subscription.created_at,
        event_id=subscription.event_id,
        event_title=subscription.event.title if subscription.event else None,
    )


@router.post("/checkout", response_model=CheckoutResponse)
@limiter.limit("20/minute")
async def post_checkout(
    request: Request,
    payload: CheckoutRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> CheckoutResponse:
    try:
        _subscription, init_point = create_checkout_preference(
            session, user=current_user, plan_id=payload.plan_id, event_id=payload.event_id
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        # La preferencia de MP no se pudo crear (token inválido/vacío, error de la API de MP, etc.)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    return CheckoutResponse(init_point=init_point)


@router.post("/transfer", response_model=SubscriptionRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def post_transfer(
    request: Request,
    payload: TransferSubscriptionRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> SubscriptionRead:
    try:
        subscription = create_transfer_subscription(
            session, user=current_user, plan_id=payload.plan_id, event_id=payload.event_id, note=payload.note
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    await send_transfer_notification_to_admin(
        user_public_name=current_user.public_name,
        plan_name=subscription.plan.name,
        amount=subscription.amount_paid,
        subscription_id=subscription.id,
        transfer_note=subscription.transfer_note,
        admin_panel_url=settings.frontend_url,
    )

    return _to_subscription_read(subscription)


@router.get("/me", response_model=list[SubscriptionRead])
@limiter.limit("60/minute")
async def get_my_subscriptions(
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[SubscriptionRead]:
    stmt = (
        select(Subscription)
        .where(Subscription.user_id == current_user.id)
        .options(
            selectinload(Subscription.plan),
            selectinload(Subscription.plan_price),
            selectinload(Subscription.event),
        )
        .order_by(Subscription.created_at.desc())
    )
    subscriptions = session.exec(stmt).all()
    return [_to_subscription_read(subscription) for subscription in subscriptions]
