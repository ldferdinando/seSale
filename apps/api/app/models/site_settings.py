from datetime import datetime, timezone

from sqlmodel import Field, SQLModel

SITE_SETTINGS_ID = 1


class SiteSettings(SQLModel, table=True):
    """Configuración general del sitio editable desde el admin — una sola
    fila (`id` = SITE_SETTINGS_ID). Pensada para sumar más datos de config a
    futuro como columnas nuevas (cada una con su migración), no como un
    key/value genérico: así cada dato sigue tipado y validado por Pydantic.
    """

    __tablename__ = "site_settings"

    id: int = Field(default=SITE_SETTINGS_ID, primary_key=True)

    payment_alias: str | None = Field(default=None, max_length=100)
    # Alias (o CBU/CVU) para el pago manual por transferencia de los planes
    # Destacado/Destacado Plus — se muestra en /planes/transferencia. None =
    # todavía no cargado: el frontend muestra el fallback de WhatsApp.

    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
