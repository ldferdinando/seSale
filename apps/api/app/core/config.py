from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Etapa 9c — valor por defecto de SECRET_KEY, nunca debe usarse en producción
# (ver el model_validator más abajo, que lo rechaza explícitamente ahí).
_DEV_SECRET_KEY = "change-me-in-dev"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./sesale.db"
    environment: str = "development"
    allowed_origins: str = "http://localhost:3000"

    secret_key: str = _DEV_SECRET_KEY
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    mercadopago_access_token: str | None = None
    mercadopago_public_key: str | None = None
    mercadopago_webhook_secret: str | None = None

    sesale_whatsapp: str = "5492994000000"
    frontend_url: str = "http://localhost:3000"
    api_url: str = "http://localhost:8000"

    resend_api_key: str | None = None
    admin_email: str = "admin@sesale.com.ar"

    # Etapa 8b — flyers de eventos (plan Destacado Plus). Sin Supabase
    # configurado (supabase_url/supabase_service_key vacíos), storage.py cae
    # a guardar los archivos en apps/api/uploads/flyers/ para desarrollo.
    supabase_url: str | None = None
    supabase_service_key: str | None = None
    supabase_storage_bucket: str = "flyers"

    # Etapa 8d — imágenes de banners (AdItem). Mismas credenciales de
    # Supabase que los flyers, bucket propio.
    supabase_banner_bucket: str = "banners"

    # Etapa 8e — foto de portada de lugares gastronómicos (Location.cover_img_url).
    # Mismas credenciales de Supabase, bucket propio.
    supabase_cover_bucket: str = "covers"

    # Etapa 9d — capa extra de seguridad para POST /api/setup/admin, además
    # del guard automático (410 si ya existe un admin). Setear a "true" en
    # Railway una vez creado el primer admin.
    disable_setup_endpoint: bool = False

    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    # Railway (y otros proveedores) inyectan DATABASE_URL como "postgresql://...",
    # sin especificar el driver. SQLAlchemy por defecto intenta cargar psycopg2
    # ahí, pero el proyecto instala psycopg (v3) — ver requirements.txt. Sin esta
    # normalización, tanto el engine de la app (core/deps.py) como Alembic
    # (alembic/env.py, que lee settings.database_url) fallan con
    # "ModuleNotFoundError: No module named 'psycopg2'".
    @model_validator(mode="after")
    def _normalize_database_url_driver(self) -> "Settings":
        if self.database_url.startswith("postgresql://"):
            self.database_url = self.database_url.replace(
                "postgresql://", "postgresql+psycopg://", 1
            )
        return self

    # Etapa 9c — auditoría de seguridad: si ENVIRONMENT=production arranca con
    # el SECRET_KEY de desarrollo (porque no se cargó la variable de entorno
    # real en Railway), cualquiera puede forjar un JWT válido (incluso de
    # admin) firmando con este valor público del repo. Falla rápido en vez de
    # arrancar "silenciosamente inseguro".
    @model_validator(mode="after")
    def _validate_production_secret_key(self) -> "Settings":
        if self.environment == "production" and self.secret_key == _DEV_SECRET_KEY:
            raise ValueError(
                "SECRET_KEY no puede ser el valor de desarrollo cuando ENVIRONMENT=production. "
                "Configurá una SECRET_KEY real (larga y aleatoria) en las variables de entorno."
            )
        return self


settings = Settings()
