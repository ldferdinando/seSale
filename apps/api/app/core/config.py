from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./sesale.db"
    environment: str = "development"
    allowed_origins: str = "http://localhost:3000"

    supabase_url: str | None = None
    supabase_jwt_secret: str | None = None
    supabase_anon_key: str | None = None

    mercadopago_access_token: str | None = None
    mercadopago_webhook_secret: str | None = None

    admin_key: str | None = None

    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


settings = Settings()
