from starlette.requests import Request

from app.core.config import settings
from app.core.deps import get_client_ip


def _make_request(headers: dict[str, str], client_host: str = "10.0.0.5") -> Request:
    scope = {
        "type": "http",
        "headers": [(name.lower().encode(), value.encode()) for name, value in headers.items()],
        "client": (client_host, 12345),
    }
    return Request(scope)


def test_uses_forwarded_for_when_no_secret_configured():
    assert settings.proxy_shared_secret is None
    request = _make_request({"x-forwarded-for": "203.0.113.7, 76.76.21.21"})

    assert get_client_ip(request) == "203.0.113.7"


def test_falls_back_to_client_host_without_forwarded_for():
    request = _make_request({})

    assert get_client_ip(request) == "10.0.0.5"


def test_trusts_forwarded_for_when_secret_matches(monkeypatch):
    monkeypatch.setattr(settings, "proxy_shared_secret", "shared-secret-value")
    request = _make_request(
        {"x-forwarded-for": "203.0.113.7, 76.76.21.21", "x-sesale-proxy-secret": "shared-secret-value"}
    )

    assert get_client_ip(request) == "203.0.113.7"


def test_ignores_forwarded_for_when_secret_missing(monkeypatch):
    # No cae a request.client.host: con --forwarded-allow-ips='*' en el
    # Procfile, uvicorn ya reescribió request.client usando el mismo
    # X-Forwarded-For que acá se está rechazando (ver docstring).
    monkeypatch.setattr(settings, "proxy_shared_secret", "shared-secret-value")
    request = _make_request({"x-forwarded-for": "203.0.113.7, 76.76.21.21"})

    assert get_client_ip(request) == "untrusted-direct-access"


def test_ignores_forwarded_for_when_secret_does_not_match(monkeypatch):
    monkeypatch.setattr(settings, "proxy_shared_secret", "shared-secret-value")
    request = _make_request(
        {"x-forwarded-for": "203.0.113.7, 76.76.21.21", "x-sesale-proxy-secret": "wrong-value"}
    )

    assert get_client_ip(request) == "untrusted-direct-access"
