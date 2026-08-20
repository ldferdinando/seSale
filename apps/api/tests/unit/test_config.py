import pytest

from app.core.config import Settings


def test_settings_allows_dev_secret_key_in_development():
    settings = Settings(environment="development", secret_key="change-me-in-dev")

    assert settings.secret_key == "change-me-in-dev"


def test_settings_allows_custom_secret_key_in_production():
    settings = Settings(environment="production", secret_key="una-clave-larga-y-aleatoria-real")

    assert settings.secret_key == "una-clave-larga-y-aleatoria-real"


def test_settings_rejects_dev_secret_key_in_production():
    # Etapa 9c — si ENVIRONMENT=production arranca con el SECRET_KEY de
    # desarrollo (porque no se cargó la variable de entorno real), cualquiera
    # puede forjar un JWT válido firmando con ese valor público del repo.
    with pytest.raises(ValueError, match="SECRET_KEY"):
        Settings(environment="production", secret_key="change-me-in-dev")
