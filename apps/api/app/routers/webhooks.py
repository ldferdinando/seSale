import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session

from app.core.config import settings
from app.core.deps import get_session
from app.services.payment_service import (
    fetch_payment_from_mp,
    handle_approved_payment,
    handle_rejected_payment,
    verify_mp_signature,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


@router.post("/mercadopago")
async def post_mercadopago_webhook(request: Request, session: Session = Depends(get_session)) -> dict[str, str]:
    x_signature = request.headers.get("x-signature")
    x_request_id = request.headers.get("x-request-id")

    body: dict = {}
    try:
        body = await request.json()
    except Exception:  # body vacío o no-JSON: MP a veces no manda body
        body = {}

    notification_id = request.query_params.get("data.id") or request.query_params.get("id")
    if not notification_id and isinstance(body.get("data"), dict):
        notification_id = body["data"].get("id")
    notification_id = str(notification_id) if notification_id else None

    topic = request.query_params.get("type") or request.query_params.get("topic") or body.get("type")

    is_valid = verify_mp_signature(
        x_signature=x_signature,
        x_request_id=x_request_id,
        notification_id=notification_id,
        secret=settings.mercadopago_webhook_secret or "",
    )
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Firma inválida")

    if topic != "payment" or not notification_id:
        logger.info("Webhook MP ignorado: topic=%s notification_id=%s", topic, notification_id)
        return {"status": "ignored"}

    try:
        payment_data = fetch_payment_from_mp(notification_id)
    except Exception:
        # No pudimos reconfirmar el pago contra la API de MP (red, token, etc.):
        # no procesamos nada, pero igual respondemos 200 — MP no debe reintentar
        # indefinidamente por un problema nuestro; queda logueado para revisar.
        logger.exception("No se pudo reconfirmar el pago %s contra la API de MP", notification_id)
        return {"status": "error_confirming_payment"}

    payment_status = payment_data.get("status")

    if payment_status == "approved":
        handle_approved_payment(session, payment_data)
    elif payment_status in ("rejected", "cancelled"):
        handle_rejected_payment(session, payment_data)
    else:
        logger.info("Webhook MP con status no manejado: %s", payment_status)

    return {"status": "ok"}
