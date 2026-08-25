import logging
from datetime import datetime
from uuid import UUID

import resend

from app.core.config import settings
from app.core.timezone import ARGENTINA_TZ

logger = logging.getLogger(__name__)

_MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]


def _format_argentina_datetime(value: datetime) -> str:
    """Formatea un datetime aware a texto legible en español, hora Argentina."""
    local = value.astimezone(ARGENTINA_TZ)
    return f"{local.day} de {_MESES[local.month - 1]} de {local.year}, {local.strftime('%H:%M')}hs"


async def send_report_email(
    event_title: str,
    event_id: UUID,
    report_text: str,
    contact_phone: str,
    event_url: str,
) -> None:
    """Envía email de reporte al admin con Resend.

    Si el envío falla (o no hay RESEND_API_KEY configurada), se loguea el
    error pero no se propaga — el reporte ya quedó guardado en la base y el
    admin puede revisarlo desde el panel aunque el email no llegue.
    """
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY no configurada — no se envía email de reporte para el evento %s", event_id)
        return

    body = (
        f"Se recibió un reporte sobre el evento: {event_title}\n"
        f"URL del evento: {event_url}\n\n"
        f"Texto del reporte:\n{report_text}\n\n"
        f"Teléfono de contacto del reportante: {contact_phone}\n\n"
        f"Para revisar este reporte ingresá al panel admin:\n{settings.frontend_url}/admin"
    )

    try:
        resend.api_key = settings.resend_api_key
        resend.Emails.send(
            {
                "from": "seSALE <reportes@sesale.com.ar>",
                "to": [settings.admin_email],
                "subject": f"Reporte de evento: {event_title}",
                "text": body,
            }
        )
    except Exception:
        logger.exception("Error al enviar el email de reporte para el evento %s", event_id)


async def send_transfer_notification_to_admin(
    user_public_name: str,
    plan_name: str,
    amount: int,
    subscription_id: UUID,
    transfer_note: str | None,
    admin_panel_url: str,
) -> None:
    """Avisa al admin que hay un aviso de transferencia pendiente de revisión.

    Etapa 6b-1: no hay comprobante adjunto todavía — el organizador lo manda
    por WhatsApp/mail fuera del sistema (ver a_revisar.md). Mismo patrón
    defensivo que send_report_email: si el envío falla, se loguea pero no
    se propaga.
    """
    if not settings.resend_api_key:
        logger.warning(
            "RESEND_API_KEY no configurada — no se envía aviso de transferencia para la suscripción %s",
            subscription_id,
        )
        return

    nota = f"\nNota del organizador: {transfer_note}\n" if transfer_note else ""
    body = (
        f"{user_public_name} avisó que realizó una transferencia para el plan {plan_name} "
        f"por ${amount} ARS.\n"
        f"{nota}\n"
        f"El comprobante todavía no se adjunta en el sistema — pedile que lo mande por "
        f"WhatsApp o email si todavía no lo hizo.\n\n"
        f"Revisar en el panel admin:\n{admin_panel_url}/admin → sección Suscripciones"
    )

    try:
        resend.api_key = settings.resend_api_key
        resend.Emails.send(
            {
                "from": "seSALE <pagos@sesale.com.ar>",
                "to": [settings.admin_email],
                "subject": f"Nueva transferencia pendiente — {plan_name}",
                "text": body,
            }
        )
    except Exception:
        logger.exception("Error al enviar el aviso de transferencia para la suscripción %s", subscription_id)


async def send_subscription_approved_email(
    user_email: str,
    user_public_name: str,
    plan_name: str,
    expires_at: datetime,
) -> None:
    """Avisa al organizador que su pago fue confirmado y el plan está activo."""
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY no configurada — no se envía email de aprobación a %s", user_email)
        return

    body = (
        f"Hola {user_public_name},\n\n"
        f"Confirmamos la recepción de tu pago.\n"
        f"Tu plan {plan_name} está activo hasta el {_format_argentina_datetime(expires_at)}.\n\n"
        f"Tus eventos ya aparecen como destacados en seSALE.\n\n"
        f"¡Gracias por confiar en seSALE!"
    )

    try:
        resend.api_key = settings.resend_api_key
        resend.Emails.send(
            {
                "from": "seSALE <pagos@sesale.com.ar>",
                "to": [user_email],
                "subject": f"¡Tu plan {plan_name} está activo! — seSALE",
                "text": body,
            }
        )
    except Exception:
        logger.exception("Error al enviar el email de aprobación a %s", user_email)


async def send_password_reset_email(
    user_email: str,
    user_name: str,
    reset_url: str,
) -> None:
    """Etapa 11a — recuperación de contraseña: envía el link de reset por
    Resend cuando está configurado. Si no lo está, `auth_service` no llega
    a llamar a esta función (ver `request_password_reset`/router de
    `forgot-password`) — el `reset_token` viaja en la respuesta solo en
    staging para poder probar el flujo sin bandeja de entrada. Mismo
    patrón defensivo que el resto de este módulo: si el envío falla, se
    loguea pero no se propaga (el token ya quedó guardado en la base)."""
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY no configurada — no se envía email de recuperación a %s", user_email)
        return

    body = (
        f"Hola {user_name},\n\n"
        f"Recibimos una solicitud para recuperar tu contraseña en seSALE.\n\n"
        f"Hacé click en el siguiente enlace para crear una nueva contraseña:\n{reset_url}\n\n"
        f"Este enlace vence en 1 hora.\n\n"
        f"Si no solicitaste esto, ignorá este email. Tu contraseña no cambiará."
    )

    try:
        resend.api_key = settings.resend_api_key
        resend.Emails.send(
            {
                "from": "seSALE <cuentas@sesale.com.ar>",
                "to": [user_email],
                "subject": "Recuperá tu contraseña — seSALE",
                "text": body,
            }
        )
    except Exception:
        logger.exception("Error al enviar el email de recuperación de contraseña a %s", user_email)


async def send_subscription_rejected_email(
    user_email: str,
    user_public_name: str,
    plan_name: str,
    admin_notes: str | None,
) -> None:
    """Avisa al organizador que su pago no pudo ser verificado."""
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY no configurada — no se envía email de rechazo a %s", user_email)
        return

    motivo = f"\nMotivo: {admin_notes}\n" if admin_notes else ""
    body = (
        f"Hola {user_public_name},\n\n"
        f"No pudimos verificar tu pago para el plan {plan_name}.\n"
        f"{motivo}\n"
        f"Si creés que hay un error, contactanos por WhatsApp: {settings.sesale_whatsapp}\n\n"
        f"Podés intentar nuevamente desde tu cuenta."
    )

    try:
        resend.api_key = settings.resend_api_key
        resend.Emails.send(
            {
                "from": "seSALE <pagos@sesale.com.ar>",
                "to": [user_email],
                "subject": "Tu pago no pudo ser verificado — seSALE",
                "text": body,
            }
        )
    except Exception:
        logger.exception("Error al enviar el email de rechazo a %s", user_email)
