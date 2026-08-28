from httpx import AsyncClient
from sqlmodel import Session, select

from app.models.event_category_catalog import EventCategoryCatalog


async def test_get_categories_returns_only_active_ordered_by_sort_order(
    client: AsyncClient, session: Session
):
    inactive = session.exec(
        select(EventCategoryCatalog).where(EventCategoryCatalog.key == "deportes")
    ).one()
    inactive.is_active = False
    session.add(inactive)
    session.commit()

    response = await client.get("/api/categories")

    assert response.status_code == 200
    body = response.json()
    keys = [c["key"] for c in body]
    assert "deportes" not in keys
    sort_orders = [c["sort_order"] for c in body]
    assert sort_orders == sorted(sort_orders)
    assert body[0]["key"] == "musica"
    assert "is_active" not in body[0]


async def test_get_categories_no_auth_required(client: AsyncClient):
    response = await client.get("/api/categories")

    assert response.status_code == 200
