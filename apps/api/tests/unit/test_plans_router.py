from httpx import AsyncClient
from sqlmodel import Session

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
