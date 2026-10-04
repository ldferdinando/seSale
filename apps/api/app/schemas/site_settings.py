from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SiteSettingsRead(BaseModel):
    """Configuración pública del sitio — GET /api/site-settings."""

    payment_alias: str | None

    model_config = ConfigDict(from_attributes=True)


class SiteSettingsAdminRead(SiteSettingsRead):
    updated_at: datetime


class SiteSettingsUpdate(BaseModel):
    """PATCH /api/admin/site-settings — solo se actualizan los campos
    enviados. `payment_alias` vacío (o solo espacios) se guarda como None."""

    payment_alias: str | None = Field(default=None, max_length=100)

    @field_validator("payment_alias")
    @classmethod
    def normalize_payment_alias(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None
