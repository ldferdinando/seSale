import pytest
from httpx import AsyncClient
from sqlmodel import Session

from app.core.config import settings
from app.models.plan import Plan


async def test_get_plans_returns_active_plans_with_current_price(
    client: AsyncClient, plan_gratis: Plan, plan_dest: Plan, plan_price_dest
):
    response = await client.get("/api/plans")

    assert response.status_code == 200
    body = response.json()
    names = {p["name"] for p in body}
    assert names == {"Gratuito", "Destacado"}

    dest = next(p for p in body if p["name"] == "Destacado")
    assert dest["price"]["amount"] == 3500
    assert dest["price"]["promo_label"] == "Promo lanzamiento"


async def test_get_plans_without_current_price_returns_null_price(client: AsyncClient, plan_banner: Plan):
    response = await client.get("/api/plans")

    assert response.status_code == 200
    banner = next(p for p in response.json() if p["name"] == "Banner web")
    assert banner["price"] is None


async def test_get_plans_excludes_inactive_plans(client: AsyncClient, session: Session, plan_dest: Plan):
    plan_dest.is_active = False
    session.add(plan_dest)
    session.commit()

    response = await client.get("/api/plans")

    assert response.status_code == 200
    assert all(p["name"] != "Destacado" for p in response.json())


async def test_get_plans_mercadopago_available_true_when_token_configured(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch, plan_dest: Plan
):
    monkeypatch.setattr(settings, "mercadopago_access_token", "APP_USR-fake-token")

    response = await client.get("/api/plans")

    assert response.status_code == 200
    assert all(p["mercadopago_available"] is True for p in response.json())


async def test_get_plans_mercadopago_available_false_when_token_missing(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch, plan_dest: Plan
):
    # Etapa 11a — BUG 2: sin token configurado (pagos manuales por ahora),
    # el frontend usa este flag para ocultar "Contratar con MercadoPago".
    monkeypatch.setattr(settings, "mercadopago_access_token", None)

    response = await client.get("/api/plans")

    assert response.status_code == 200
    assert all(p["mercadopago_available"] is False for p in response.json())
