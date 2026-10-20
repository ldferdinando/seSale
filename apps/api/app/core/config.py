from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Etapa 9c — valor por defecto de SECRET_KEY, nunca debe usarse en producción
# (ver el model_validator más abajo, que lo rechaza explícitamente ahí).
_DEV_SECRET_KEY = "change-me-in-dev"
_DEFAULT_RESEND_FROM_EMAIL = "seSALE <onboarding@resend.dev>"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./sesale.db"
    # Pool de conexiones a Postgres por worker (ver el comentario en
    # core/deps.py). Defaults pensados para Supabase Free (t4g.nano,
    # max_connections=60): subirlos con DB_POOL_SIZE/DB_MAX_OVERFLOW si se
    # sube de compute, sin tocar código.
    db_pool_size: int = 5
    db_max_overflow: int = 5
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
    # Remitente de todos los emails (formato "Nombre <direccion>"). El default
    # es el remitente de prueba de Resend, que funciona sin dominio verificado
    # (solo entrega a la casilla dueña de la cuenta de Resend). En producción,
    # setear RESEND_FROM_EMAIL a una dirección del dominio verificado.
    resend_from_email: str = _DEFAULT_RESEND_FROM_EMAIL
    # Opcional: si tiene valor, las respuestas a los emails van a esta casilla.
    resend_reply_to: str | None = None

    # Login con Google (ID token, sin client secret) — POST /api/auth/google.
    # Debe coincidir con el Client ID usado en el frontend
    # (NEXT_PUBLIC_GOOGLE_CLIENT_ID): se usa para validar el `aud` del token.
    google_client_id: str | None = None

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

    # Auditoría post-lanzamiento — mitigación de X-Forwarded-For spoofing
    # (ver core/deps.py, get_client_ip). Vacío = sin cambios de comportamiento
    # (sigue confiando en X-Forwarded-For sin más, como hasta ahora). Con un
    # valor configurado, solo se confía en X-Forwarded-For cuando la request
    # trae el header x-sesale-proxy-secret con este mismo valor (lo setea el
    # middleware de Next.js — apps/web/src/middleware.ts — antes de la
    # rewrite /api/* a este backend). Debe coincidir byte a byte con
    # PROXY_SHARED_SECRET en el entorno del frontend.
    proxy_shared_secret: str | None = None

    # `.env.example` deja RESEND_FROM_EMAIL/RESEND_REPLY_TO vacíos: un string
    # vacío en el entorno se trata como "no configurado" (default / sin reply-to).
    @field_validator("resend_from_email", mode="before")
    @classmethod
    def _blank_from_email_uses_default(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return _DEFAULT_RESEND_FROM_EMAIL
        return value

    @field_validator("resend_reply_to", mode="before")
    @classmethod
    def _blank_reply_to_is_none(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value

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
