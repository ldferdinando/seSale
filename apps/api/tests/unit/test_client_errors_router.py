from httpx import AsyncClient


def _payload(**overrides):
    base = {
        "message": "TypeError: cannot read properties of undefined",
        "stack": "at HomeContent (page.tsx:10:5)",
        "url": "https://sesale.com.ar/",
        "user_agent": "Mozilla/5.0 (Linux; Android 11) WebView",
        "source": "error-boundary",
    }
    base.update(overrides)
    return base


async def test_post_client_error_success(client: AsyncClient):
    response = await client.post("/api/client-errors", json=_payload())

    assert response.status_code == 204
    assert response.content == b""


async def test_post_client_error_without_stack_is_optional(client: AsyncClient):
    payload = _payload()
    del payload["stack"]

    response = await client.post("/api/client-errors", json=payload)

    assert response.status_code == 204


async def test_post_client_error_missing_message_returns_422(client: AsyncClient):
    payload = _payload()
    del payload["message"]

    response = await client.post("/api/client-errors", json=payload)

    assert response.status_code == 422


async def test_post_client_error_rate_limited_after_five_per_minute(client: AsyncClient):
    payload = _payload()

    for _ in range(5):
        response = await client.post("/api/client-errors", json=payload)
        assert response.status_code == 204

    sixth = await client.post("/api/client-errors", json=payload)
    assert sixth.status_code == 429
