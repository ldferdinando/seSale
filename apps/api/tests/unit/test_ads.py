"""Tests de GET /api/ads (público) — Etapa 8d."""

from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch

from httpx import AsyncClient
from sqlmodel import Session

from app.models.ad_item import AdItem
from app.models.ad_slot import AdSlot
from app.models.city import City
from app.models.user import User


def _make_slot(session: Session, *, city: City, section: str = "eventos", slot_position: int = 0, **kwargs) -> AdSlot:
    slot = AdSlot(city_id=city.id, section=section, slot_position=slot_position, **kwargs)
    session.add(slot)
    session.commit()
    session.refresh(slot)
    return slot


def _make_item(session: Session, *, slot: AdSlot, user: User, admin: User, **kwargs) -> AdItem:
    item = AdItem(slot_id=slot.id, user_id=user.id, img_url="https://example.com/b.jpg", created_by=admin.id, **kwargs)
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


async def test_get_ads_returns_slots_with_empty_items(client: AsyncClient, session: Session, city: City):
    for pos in range(3):
        _make_slot(session, city=city, section="eventos", slot_position=pos)

    response = await client.get("/api/ads", params={"city_id": str(city.id), "section": "eventos"})

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 3
    assert [slot["slot_position"] for slot in body] == [0, 1, 2]
    assert all(slot["items"] == [] for slot in body)


async def test_get_ads_includes_active_and_current_item(
    client: AsyncClient, session: Session, city: City, organizer: User, admin: User
):
    slot = _make_slot(session, city=city, section="eventos", slot_position=0)
    _make_item(session, slot=slot, user=organizer, admin=admin, status="active")

    response = await client.get("/api/ads", params={"city_id": str(city.id), "section": "eventos"})

    body = response.json()
    assert len(body[0]["items"]) == 1
    item = body[0]["items"][0]
    assert "user_id" not in item
    assert "advertiser_name" not in item
    assert item["img_url"] == "https://example.com/b.jpg"


async def test_get_ads_excludes_paused_item(
    client: AsyncClient, session: Session, city: City, organizer: User, admin: User
):
    slot = _make_slot(session, city=city, section="eventos", slot_position=0)
    _make_item(session, slot=slot, user=organizer, admin=admin, status="paused")

    response = await client.get("/api/ads", params={"city_id": str(city.id), "section": "eventos"})

    assert response.json()[0]["items"] == []


async def test_get_ads_excludes_expired_item(
    client: AsyncClient, session: Session, city: City, organizer: User, admin: User
):
    slot = _make_slot(session, city=city, section="eventos", slot_position=0)
    _make_item(
        session, slot=slot, user=organizer, admin=admin, status="active", ends_at=date.today() - timedelta(days=1)
    )

    response = await client.get("/api/ads", params={"city_id": str(city.id), "section": "eventos"})

    assert response.json()[0]["items"] == []


async def test_get_ads_excludes_item_with_future_starts_at(
    client: AsyncClient, session: Session, city: City, organizer: User, admin: User
):
    # El servicio compara starts_at contra datetime.now(timezone.utc).date() (ver
    # ad_service._is_current), no contra date.today() local: si se usa date.today()
    # acá, en el servidor (UTC-3) hay una ventana diaria (~21:00-23:59 hora local,
    # cuando el reloj UTC ya cruzó la medianoche) en la que "mañana" local coincide
    # con "hoy" en UTC, y el test se vuelve flaky. Por eso se calcula en UTC.
    tomorrow_utc = datetime.now(timezone.utc).date() + timedelta(days=1)
    slot = _make_slot(session, city=city, section="eventos", slot_position=0)
    _make_item(session, slot=slot, user=organizer, admin=admin, status="active", starts_at=tomorrow_utc)

    response = await client.get("/api/ads", params={"city_id": str(city.id), "section": "eventos"})

    assert response.json()[0]["items"] == []


async def test_get_ads_orders_items_by_display_order(
    client: AsyncClient, session: Session, city: City, organizer: User, admin: User
):
    slot = _make_slot(session, city=city, section="eventos", slot_position=0)
    _make_item(session, slot=slot, user=organizer, admin=admin, status="active", display_order=2, alt_text="c")
    _make_item(session, slot=slot, user=organizer, admin=admin, status="active", display_order=0, alt_text="a")
    _make_item(session, slot=slot, user=organizer, admin=admin, status="active", display_order=1, alt_text="b")

    response = await client.get("/api/ads", params={"city_id": str(city.id), "section": "eventos"})

    alt_texts = [item["alt_text"] for item in response.json()[0]["items"]]
    assert alt_texts == ["a", "b", "c"]


async def test_get_ads_without_city_id_returns_422(client: AsyncClient):
    response = await client.get("/api/ads", params={"section": "eventos"})
    assert response.status_code == 422


async def test_get_ads_without_section_returns_422(client: AsyncClient, city: City):
    response = await client.get("/api/ads", params={"city_id": str(city.id)})
    assert response.status_code == 422


async def test_get_ads_invalid_section_returns_422(client: AsyncClient, city: City):
    response = await client.get("/api/ads", params={"city_id": str(city.id), "section": "no-existe"})
    assert response.status_code == 422


async def test_get_ads_triggers_expire_overdue_ad_items_in_background(client: AsyncClient, city: City):
    with patch("app.routers.ads.run_expire_overdue_ad_items_task") as mock_task:
        response = await client.get("/api/ads", params={"city_id": str(city.id), "section": "eventos"})

    assert response.status_code == 200
    mock_task.assert_called_once()
