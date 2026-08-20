import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session

from app.core.config import settings
from app.core.deps import get_client_ip, get_session
from app.core.limiter import limiter
from app.models.user import User
from app.schemas.user import SetupAdminCreate, UserRead
from app.services.user_service import admin_exists, create_first_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/setup", tags=["setup"])

_ALREADY_DONE_DETAIL = "Setup already completed. This endpoint is permanently disabled."


@router.post("/admin", response_model=UserRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour", key_func=get_client_ip)
async def post_setup_admin(
    request: Request,
    payload: SetupAdminCreate,
    session: Session = Depends(get_session),
) -> User:
    """Etapa 9d — único endpoint público que crea un admin: en producción no
    corre seed.py y no hay forma de crear el primer admin sin acceso SSH al
    servidor. Se auto-desactiva para siempre apenas existe un admin (410),
    y además puede forzarse a desactivado con DISABLE_SETUP_ENDPOINT=true
    (capa extra, sin ni siquiera consultar la DB)."""
    ip = get_client_ip(request)
    now = datetime.now(timezone.utc).isoformat()

    if settings.disable_setup_endpoint:
        logger.info("setup.admin.disabled_by_env ip=%s time=%s", ip, now)
        raise HTTPException(status_code=status.HTTP_410_GONE, detail=_ALREADY_DONE_DETAIL)

    if admin_exists(session):
        logger.info("setup.admin.already_done ip=%s time=%s", ip, now)
        raise HTTPException(status_code=status.HTTP_410_GONE, detail=_ALREADY_DONE_DETAIL)

    try:
        admin = create_first_admin(
            session,
            email=payload.email,
            password=payload.password,
            full_name=payload.full_name,
            public_name=payload.public_name,
        )
    except ValueError as exc:
        logger.warning("setup.admin.failed ip=%s time=%s reason=%s", ip, now, exc)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    logger.info("setup.admin.created ip=%s time=%s user_id=%s", ip, now, admin.id)
    return admin
