from httpx import AsyncClient


async def test_api_health_returns_ok(client: AsyncClient):
    response = await client.get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "environment" in body
