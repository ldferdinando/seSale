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


def test_settings_db_pool_defaults_fit_supabase_free(monkeypatch):
    # Supabase Free (t4g.nano): max_connections=60, ~15 ya usadas por
    # Supabase. 2 workers × (pool_size + max_overflow) tiene que quedar lejos.
    monkeypatch.delenv("DB_POOL_SIZE", raising=False)
    monkeypatch.delenv("DB_MAX_OVERFLOW", raising=False)
    settings = Settings(_env_file=None)

    assert settings.db_pool_size == 5
    assert settings.db_max_overflow == 5
    assert 2 * (settings.db_pool_size + settings.db_max_overflow) <= 20


def test_settings_db_pool_configurable_from_env(monkeypatch):
    monkeypatch.setenv("DB_POOL_SIZE", "15")
    monkeypatch.setenv("DB_MAX_OVERFLOW", "8")
    settings = Settings(_env_file=None)

    assert settings.db_pool_size == 15
    assert settings.db_max_overflow == 8
