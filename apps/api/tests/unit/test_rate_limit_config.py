"""Los límites configurados son la mitad del límite real deseado.

slowapi usa MemoryStorage por proceso: con WEB_CONCURRENCY=2 (Procfile) cada
worker cuenta aparte y el límite real por IP es 2 × el configurado (ver
`core/limiter.py`). Los tests de 429 de cada router solo cuentan requests, así
que no distinguen "3/hour" de "3/2hours": este test fija la ventana.
"""

from app.core.limiter import limiter
from app.main import app  # noqa: F401 — importa los routers y registra los límites


def _configured(route: str) -> list[str]:
    return [str(limit.limit) for limit in limiter._route_limits[route]]


def test_odd_limits_double_the_window_instead_of_halving_the_count():
    assert _configured("app.routers.auth.login") == ["5 per 2 minute"]
    assert _configured("app.routers.auth.forgot_password") == ["3 per 2 hour"]
    assert _configured("app.routers.setup.post_setup_admin") == ["5 per 2 hour"]
    assert _configured("app.routers.reports.post_event_report") == ["3 per 2 hour"]


def test_even_limits_are_halved():
    assert _configured("app.routers.auth.register") == ["5 per 1 hour"]
    assert _configured("app.routers.auth.google_login") == ["5 per 1 minute"]
    assert _configured("app.routers.webhooks.post_mercadopago_webhook") == ["30 per 1 minute"]


def test_no_route_keeps_a_pre_halving_limit():
    configured = {str(limit.limit) for limits in limiter._route_limits.values() for limit in limits}
    # Solo los valores viejos que no coinciden con ningún valor nuevo
    # (30/minute, 10/minute, 5/minute y 5/hour siguen existiendo, ya partidos).
    assert configured.isdisjoint({"60 per 1 minute", "10 per 1 hour", "3 per 1 hour"})
