from datetime import date, timedelta

import pytest
from httpx import AsyncClient
from sqlmodel import Session, select

from app.models.plan import Plan, PlanPrice, PlanType, PricingType
from app.models.user import User
from app.services.payment_service import get_current_plan_price, set_plan_price


@pytest.fixture(name="plan_pro")
def plan_pro_fixture(session: Session) -> Plan:
    plan = Plan(name="Destacado Plus", plan_type=PlanType.pro, pricing_type=PricingType.fixed, is_active=True)
    session.add(plan)
    session.commit()
    session.refresh(plan)
    return plan


def _prices(session: Session, plan: Plan) -> list[PlanPrice]:
    session.expire_all()
    return list(session.exec(select(PlanPrice).where(PlanPrice.plan_id == plan.id)).all())


def _overlaps_today_onwards(price: PlanPrice, today: date) -> bool:
    return price.valid_from <= (price.valid_until or date.max) and (price.valid_until is None or price.valid_until >= today)


# ── Servicio ────────────────────────────────────────────────────────────────


def test_set_plan_price_creates_new_row_and_closes_previous(
    session: Session, plan_dest: Plan, plan_price_dest: PlanPrice, admin: User
):
    plan_price_dest.valid_from = date.today() - timedelta(days=10)
    session.add(plan_price_dest)
    session.commit()

    new_price = set_plan_price(session, plan_id=plan_dest.id, amount=5000, admin_id=admin.id)

    assert new_price.amount == 5000
    assert new_price.currency == "ARS"
    assert new_price.valid_from == date.today()
    assert new_price.valid_until is None
    assert new_price.created_by == admin.id
    session.refresh(plan_price_dest)
    assert plan_price_dest.amount == 3500  # no se edita in-place
    assert plan_price_dest.valid_until == date.today() - timedelta(days=1)
    assert get_current_plan_price(session, plan_dest.id).id == new_price.id


def test_set_plan_price_twice_same_day_leaves_single_current_price(
    session: Session, plan_dest: Plan, plan_price_dest: PlanPrice, admin: User
):
    set_plan_price(session, plan_id=plan_dest.id, amount=4000, admin_id=admin.id)
    latest = set_plan_price(session, plan_id=plan_dest.id, amount=4500, admin_id=admin.id)

    prices = _prices(session, plan_dest)
    assert len(prices) == 3
    applicable = [p for p in prices if p.valid_from <= date.today() and (p.valid_until is None or p.valid_until >= date.today())]
    assert [p.id for p in applicable] == [latest.id]
    assert get_current_plan_price(session, plan_dest.id).amount == 4500


def test_set_plan_price_closes_future_scheduled_price(session: Session, plan_dest: Plan, admin: User):
    future = PlanPrice(plan_id=plan_dest.id, amount=9999, valid_from=date.today() + timedelta(days=5))
    session.add(future)
    session.commit()

    new_price = set_plan_price(session, plan_id=plan_dest.id, amount=5000, admin_id=admin.id)

    overlapping = [p for p in _prices(session, plan_dest) if _overlaps_today_onwards(p, date.today())]
    assert [p.id for p in overlapping] == [new_price.id]


def test_set_plan_price_rejects_non_positive_amount(session: Session, plan_dest: Plan, admin: User):
    with pytest.raises(ValueError):
        set_plan_price(session, plan_id=plan_dest.id, amount=0, admin_id=admin.id)


def test_set_plan_price_rejects_gratis_and_banner(session: Session, plan_gratis: Plan, plan_banner: Plan, admin: User):
    with pytest.raises(ValueError):
        set_plan_price(session, plan_id=plan_gratis.id, amount=100, admin_id=admin.id)
    with pytest.raises(ValueError):
        set_plan_price(session, plan_id=plan_banner.id, amount=100, admin_id=admin.id)


# ── Endpoints ───────────────────────────────────────────────────────────────


async def test_admin_list_plans_returns_paid_plans_with_current_price_and_history(
    client: AsyncClient,
    admin_token_headers: dict[str, str],
    plan_gratis: Plan,
    plan_banner: Plan,
    plan_dest: Plan,
    plan_price_dest: PlanPrice,
    plan_pro: Plan,
):
    response = await client.get("/api/admin/plans", headers=admin_token_headers)

    assert response.status_code == 200
    body = response.json()
    assert {p["plan_type"] for p in body} == {"dest", "pro"}
    dest = next(p for p in body if p["plan_type"] == "dest")
    assert dest["current_price"]["amount"] == 3500
    assert dest["current_price"]["currency"] == "ARS"
    assert len(dest["history"]) == 1
    pro = next(p for p in body if p["plan_type"] == "pro")
    assert pro["current_price"] is None
    assert pro["history"] == []


async def test_admin_create_plan_price_is_reflected_immediately_in_public_plans(
    client: AsyncClient, admin_token_headers: dict[str, str], plan_dest: Plan, plan_price_dest: PlanPrice
):
    response = await client.post(
        f"/api/admin/plans/{plan_dest.id}/prices",
        json={"amount": 7000, "promo_label": "  ", "notes": "Ajuste por inflación"},
        headers=admin_token_headers,
    )

    assert response.status_code == 201
    created = response.json()
    assert created["amount"] == 7000
    assert created["promo_label"] is None
    assert created["valid_until"] is None

    public = await client.get("/api/plans")
    dest = next(p for p in public.json() if p["plan_type"] == "dest")
    assert dest["price"]["amount"] == 7000
    assert dest["price"]["id"] == created["id"]
    assert dest["price"]["id"] != str(plan_price_dest.id)

    admin_list = await client.get("/api/admin/plans", headers=admin_token_headers)
    dest_admin = next(p for p in admin_list.json() if p["plan_type"] == "dest")
    assert dest_admin["current_price"]["id"] == created["id"]
    assert [h["amount"] for h in dest_admin["history"]] == [7000, 3500]
    old = dest_admin["history"][1]
    assert old["valid_until"] == (date.today() - timedelta(days=1)).isoformat()


async def test_admin_create_plan_price_from_zero_placeholder(
    client: AsyncClient, admin_token_headers: dict[str, str], session: Session, plan_pro: Plan
):
    # Caso producción: la migración 0017 deja precios placeholder en $0.
    session.add(PlanPrice(plan_id=plan_pro.id, amount=0, valid_from=date.today() - timedelta(days=3)))
    session.commit()

    response = await client.post(
        f"/api/admin/plans/{plan_pro.id}/prices", json={"amount": 6500}, headers=admin_token_headers
    )

    assert response.status_code == 201
    public = await client.get("/api/plans")
    pro = next(p for p in public.json() if p["plan_type"] == "pro")
    assert pro["price"]["amount"] == 6500


@pytest.mark.parametrize("amount", [0, -100, 100_000_001])
async def test_admin_create_plan_price_invalid_amount_returns_422(
    client: AsyncClient, admin_token_headers: dict[str, str], plan_dest: Plan, amount: int
):
    response = await client.post(
        f"/api/admin/plans/{plan_dest.id}/prices", json={"amount": amount}, headers=admin_token_headers
    )

    assert response.status_code == 422


async def test_admin_create_plan_price_ignores_currency(
    client: AsyncClient, admin_token_headers: dict[str, str], plan_dest: Plan
):
    response = await client.post(
        f"/api/admin/plans/{plan_dest.id}/prices",
        json={"amount": 5000, "currency": "USD"},
        headers=admin_token_headers,
    )

    assert response.status_code == 201
    assert response.json()["currency"] == "ARS"


async def test_admin_create_plan_price_for_banner_returns_400(
    client: AsyncClient, admin_token_headers: dict[str, str], plan_banner: Plan
):
    response = await client.post(
        f"/api/admin/plans/{plan_banner.id}/prices", json={"amount": 5000}, headers=admin_token_headers
    )

    assert response.status_code == 400


async def test_admin_create_plan_price_unknown_plan_returns_404(
    client: AsyncClient, admin_token_headers: dict[str, str]
):
    response = await client.post(
        "/api/admin/plans/00000000-0000-0000-0000-000000000000/prices",
        json={"amount": 5000},
        headers=admin_token_headers,
    )

    assert response.status_code == 404


async def test_admin_plans_unauthenticated_returns_401(client: AsyncClient, plan_dest: Plan):
    assert (await client.get("/api/admin/plans")).status_code == 401
    assert (await client.post(f"/api/admin/plans/{plan_dest.id}/prices", json={"amount": 1})).status_code == 401


async def test_admin_plans_non_admin_returns_403(
    client: AsyncClient, user_token_headers: dict[str, str], plan_dest: Plan
):
    assert (await client.get("/api/admin/plans", headers=user_token_headers)).status_code == 403
    response = await client.post(
        f"/api/admin/plans/{plan_dest.id}/prices", json={"amount": 5000}, headers=user_token_headers
    )
    assert response.status_code == 403
