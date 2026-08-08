from httpx import AsyncClient
from sqlmodel import Session

from app.models.plan import Plan
from app.models.user import User
from tests.conftest import FakeMPSDK


async def test_checkout_without_token_returns_401(client: AsyncClient, plan_dest: Plan):
    response = await client.post("/api/subscriptions/checkout", json={"plan_id": str(plan_dest.id)})

    assert response.status_code == 401


async def test_checkout_with_gratis_plan_returns_400(
    client: AsyncClient, plan_gratis: Plan, user_token_headers: dict[str, str], fake_mp_sdk: FakeMPSDK
):
    response = await client.post(
        "/api/subscriptions/checkout", json={"plan_id": str(plan_gratis.id)}, headers=user_token_headers
    )

    assert response.status_code == 400


async def test_checkout_with_banner_plan_returns_400(
    client: AsyncClient, plan_banner: Plan, user_token_headers: dict[str, str], fake_mp_sdk: FakeMPSDK
):
    response = await client.post(
        "/api/subscriptions/checkout", json={"plan_id": str(plan_banner.id)}, headers=user_token_headers
    )

    assert response.status_code == 400


async def test_checkout_with_dest_plan_returns_init_point(
    client: AsyncClient,
    plan_dest: Plan,
    plan_price_dest,
    user_token_headers: dict[str, str],
    fake_mp_sdk: FakeMPSDK,
):
    response = await client.post(
        "/api/subscriptions/checkout", json={"plan_id": str(plan_dest.id)}, headers=user_token_headers
    )

    assert response.status_code == 200
    assert response.json()["init_point"] == fake_mp_sdk.init_point
    assert fake_mp_sdk.last_preference_data["external_reference"]


async def test_checkout_with_plan_without_price_returns_404(
    client: AsyncClient, session: Session, plan_dest: Plan, user_token_headers: dict[str, str], fake_mp_sdk: FakeMPSDK
):
    response = await client.post(
        "/api/subscriptions/checkout", json={"plan_id": str(plan_dest.id)}, headers=user_token_headers
    )

    assert response.status_code == 404


async def test_get_my_subscriptions_returns_only_own(
    client: AsyncClient,
    session: Session,
    organizer: User,
    plan_dest: Plan,
    plan_price_dest,
    user_token_headers: dict[str, str],
    fake_mp_sdk: FakeMPSDK,
):
    checkout = await client.post(
        "/api/subscriptions/checkout", json={"plan_id": str(plan_dest.id)}, headers=user_token_headers
    )
    assert checkout.status_code == 200

    response = await client.get("/api/subscriptions/me", headers=user_token_headers)

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["plan_name"] == "Destacado"
    assert body[0]["status"] == "pending_payment"


async def test_get_my_subscriptions_without_token_returns_401(client: AsyncClient):
    response = await client.get("/api/subscriptions/me")

    assert response.status_code == 401
