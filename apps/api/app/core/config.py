from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./sesale.db"
    environment: str = "development"
    allowed_origins: str = "http://localhost:3000"

    secret_key: str = "change-me-in-dev"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    mercadopago_access_token: str | None = None
    mercadopago_public_key: str | None = None
    mercadopago_webhook_secret: str | None = None

    sesale_whatsapp: str = "5492994000000"
    frontend_url: str = "http://localhost:3000"
    api_url: str = "http://localhost:8000"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


settings = Settings()
