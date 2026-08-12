import logging
from uuid import UUID

import resend

from app.core.config import settings

logger = logging.getLogger(__name__)


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
