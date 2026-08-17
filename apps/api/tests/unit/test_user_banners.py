"""Tests de GET /api/users/me/banners — Etapa 8d."""

from httpx import AsyncClient
from sqlmodel import Session

from app.models.ad_item import AdItem
from app.models.ad_slot import AdSlot
from app.models.city import City
from app.models.user import User


def _make_slot(session: Session, *, city: City, section: str = "eventos", slot_position: int = 0) -> AdSlot:
    slot = AdSlot(city_id=city.id, section=section, slot_position=slot_position)
    session.add(slot)
    session.commit()
    session.refresh(slot)
    return slot


def _make_item(session: Session, *, slot: AdSlot, user: User, admin: User, **kwargs) -> AdItem:
    defaults = {"img_url": "https://example.com/b.jpg"}
    defaults.update(kwargs)
    item = AdItem(slot_id=slot.id, user_id=user.id, created_by=admin.id, **defaults)
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


async def test_get_my_banners_lists_own_items(
    client: AsyncClient, session: Session, city: City, organizer: User, admin: User, user_token_headers
):
    slot = _make_slot(session, city=city)
    _make_item(session, slot=slot, user=organizer, admin=admin, alt_text="mío")

    response = await client.get("/api/users/me/banners", headers=user_token_headers)

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["alt_text"] == "mío"


async def test_get_my_banners_does_not_include_other_users_items(
    client: AsyncClient, session: Session, city: City, organizer: User, admin: User, admin_token_headers
):
    slot = _make_slot(session, city=city)
    _make_item(session, slot=slot, user=organizer, admin=admin)

    response = await client.get("/api/users/me/banners", headers=admin_token_headers)

    assert response.json() == []


async def test_get_my_banners_without_auth_returns_401(client: AsyncClient):
    response = await client.get("/api/users/me/banners")
    assert response.status_code == 401
