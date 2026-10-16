import logging

from fastapi import APIRouter, Request, Response, status

from app.core.deps import get_client_ip
from app.core.limiter import limiter
from app.schemas.client_error import ClientErrorCreate

logger = logging.getLogger("client_errors")

router = APIRouter(prefix="/api/client-errors", tags=["client-errors"])


@router.post("", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("5/minute", key_func=get_client_ip)
def post_client_error(request: Request, payload: ClientErrorCreate) -> Response:
    """Reporte de errores de runtime del frontend (error.tsx/global-error.tsx
    y el listener de window.onerror/unhandledrejection, ver
    ClientErrorListener.tsx) — sin DB nueva a propósito, van a los logs de
    Railway (ver a_revisar.md para la alternativa de un servicio gratuito de
    error-tracking, no instalada todavía)."""
    logger.error(
        "client_error source=%s ip=%s url=%s user_agent=%s message=%s stack=%s",
        payload.source,
        get_client_ip(request),
        payload.url,
        payload.user_agent,
        payload.message,
        payload.stack,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
