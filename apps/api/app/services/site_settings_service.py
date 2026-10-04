from datetime import datetime, timezone

from sqlmodel import Session

from app.models.site_settings import SITE_SETTINGS_ID, SiteSettings
from app.schemas.site_settings import SiteSettingsUpdate


def get_site_settings(session: Session) -> SiteSettings:
    """Devuelve la única fila de configuración. La migración la inserta,
    pero si faltara (ej. tests sobre SQLite con `create_all`) se crea vacía
    acá en vez de devolver 404."""
    site_settings = session.get(SiteSettings, SITE_SETTINGS_ID)
    if site_settings is None:
        site_settings = SiteSettings(id=SITE_SETTINGS_ID)
        session.add(site_settings)
        session.commit()
        session.refresh(site_settings)
    return site_settings


def update_site_settings(session: Session, payload: SiteSettingsUpdate) -> SiteSettings:
    site_settings = get_site_settings(session)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(site_settings, field, value)
    site_settings.updated_at = datetime.now(timezone.utc)
    session.add(site_settings)
    session.commit()
    session.refresh(site_settings)
    return site_settings
