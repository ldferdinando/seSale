from fastapi import APIRouter, Depends, Request
from sqlmodel import Session

from app.core.deps import get_session
from app.core.limiter import limiter
from app.schemas.site_settings import SiteSettingsRead
from app.services.site_settings_service import get_site_settings

router = APIRouter(prefix="/api/site-settings", tags=["site-settings"])


@router.get("", response_model=SiteSettingsRead)
@limiter.limit("60/minute")
def get_public_site_settings(request: Request, session: Session = Depends(get_session)) -> SiteSettingsRead:
    """Configuración pública del sitio (alias de pago por transferencia)."""
    return SiteSettingsRead.model_validate(get_site_settings(session))
