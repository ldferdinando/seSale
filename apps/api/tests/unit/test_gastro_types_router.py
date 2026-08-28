from httpx import AsyncClient
from sqlmodel import Session, select

from app.models.gastro_type_catalog import GastroTypeCatalog


async def test_get_gastro_types_returns_only_active_ordered_by_sort_order(
    client: AsyncClient, session: Session
):
    inactive = session.exec(select(GastroTypeCatalog).where(GastroTypeCatalog.key == "otro")).one()
    inactive.is_active = False
    session.add(inactive)
    session.commit()

    response = await client.get("/api/gastro-types")

    assert response.status_code == 200
    body = response.json()
    keys = [t["key"] for t in body]
    assert "otro" not in keys
    sort_orders = [t["sort_order"] for t in body]
    assert sort_orders == sorted(sort_orders)
    assert body[0]["key"] == "cerveceria"
    assert "is_active" not in body[0]


async def test_get_gastro_types_no_auth_required(client: AsyncClient):
    response = await client.get("/api/gastro-types")

    assert response.status_code == 200
