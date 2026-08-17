"""Tests de los endpoints admin de banners (Etapa 8d):
GET /api/admin/ad-slots, GET/POST/PUT/DELETE /api/admin/ad-items,
PATCH .../status, POST .../image, PATCH .../reorder.
"""

from httpx import AsyncClient
from sqlmodel import Session

from app.models.ad_item import AdItem
from app.models.ad_slot import AdSlot
from app.models.city import City
from app.models.user import User

TINY_PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753"
    "de0000000c4944415478da6360000002000155a24d770000000049454e44ae426082"
)
TINY_GIF = bytes.fromhex("47494638396101000100800000000000ffffff21f90401000000002c00000000010001000002024401003b")


def _make_slot(session: Session, *, city: City, section: str = "eventos", slot_position: int = 0, **kwargs) -> AdSlot:
    slot = AdSlot(city_id=city.id, section=section, slot_position=slot_position, **kwargs)
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


# ── GET /api/admin/ad-slots ──────────────────────────────────────────────


async def test_get_admin_ad_slots_includes_all_items_regardless_of_status(
    client: AsyncClient, session: Session, city: City, organizer: User, admin: User, admin_token_headers
):
    slot = _make_slot(session, city=city)
    _make_item(session, slot=slot, user=organizer, admin=admin, status="active")
    _make_item(session, slot=slot, user=organizer, admin=admin, status="paused")
    _make_item(session, slot=slot, user=organizer, admin=admin, status="expired")

    response = await client.get(
        "/api/admin/ad-slots", params={"city_id": str(city.id)}, headers=admin_token_headers
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body[0]["items"]) == 3


async def test_get_admin_ad_slots_without_auth_returns_401(client: AsyncClient, city: City):
    response = await client.get("/api/admin/ad-slots", params={"city_id": str(city.id)})
    assert response.status_code == 401


async def test_get_admin_ad_slots_by_user_returns_403(client: AsyncClient, city: City, user_token_headers):
    response = await client.get(
        "/api/admin/ad-slots", params={"city_id": str(city.id)}, headers=user_token_headers
    )
    assert response.status_code == 403


# ── POST /api/admin/ad-items ─────────────────────────────────────────────


async def test_post_admin_ad_item_without_auth_returns_401(client: AsyncClient, session: Session, city: City, organizer: User, admin: User):
    slot = _make_slot(session, city=city)
    response = await client.post(
        "/api/admin/ad-items",
        json={"slot_id": str(slot.id), "user_id": str(organizer.id), "img_url": "https://x.com/a.jpg"},
    )
    assert response.status_code == 401


async def test_post_admin_ad_item_by_user_returns_403(
    client: AsyncClient, session: Session, city: City, organizer: User, user_token_headers
):
    slot = _make_slot(session, city=city)
    response = await client.post(
        "/api/admin/ad-items",
        json={"slot_id": str(slot.id), "user_id": str(organizer.id), "img_url": "https://x.com/a.jpg"},
        headers=user_token_headers,
    )
    assert response.status_code == 403


async def test_post_admin_ad_item_by_admin_copies_advertiser_name_from_user(
    client: AsyncClient, session: Session, city: City, organizer: User, admin_token_headers
):
    slot = _make_slot(session, city=city)

    response = await client.post(
        "/api/admin/ad-items",
        json={"slot_id": str(slot.id), "user_id": str(organizer.id), "img_url": "https://x.com/a.jpg"},
        headers=admin_token_headers,
    )

    assert response.status_code == 201
    body = response.json()
    assert body["advertiser_name"] == organizer.public_name
    assert body["user_id"] == str(organizer.id)
    assert body["status"] == "active"


async def test_post_admin_ad_item_with_explicit_advertiser_name(
    client: AsyncClient, session: Session, city: City, organizer: User, admin_token_headers
):
    slot = _make_slot(session, city=city)

    response = await client.post(
        "/api/admin/ad-items",
        json={
            "slot_id": str(slot.id),
            "user_id": str(organizer.id),
            "img_url": "https://x.com/a.jpg",
            "advertiser_name": "Otro nombre",
        },
        headers=admin_token_headers,
    )

    assert response.json()["advertiser_name"] == "Otro nombre"


async def test_post_admin_ad_item_invalid_slot_returns_404(
    client: AsyncClient, organizer: User, admin_token_headers
):
    response = await client.post(
        "/api/admin/ad-items",
        json={
            "slot_id": "00000000-0000-0000-0000-000000000000",
            "user_id": str(organizer.id),
            "img_url": "https://x.com/a.jpg",
        },
        headers=admin_token_headers,
    )
    assert response.status_code == 404


async def test_post_admin_ad_item_starts_after_ends_returns_422(
    client: AsyncClient, session: Session, city: City, organizer: User, admin_token_headers
):
    slot = _make_slot(session, city=city)
    response = await client.post(
        "/api/admin/ad-items",
        json={
            "slot_id": str(slot.id),
            "user_id": str(organizer.id),
            "img_url": "https://x.com/a.jpg",
            "starts_at": "2026-06-01",
            "ends_at": "2026-05-01",
        },
        headers=admin_token_headers,
    )
    assert response.status_code == 422


# ── POST /api/admin/ad-items/{id}/image ──────────────────────────────────


async def test_post_admin_ad_item_image_uploads_ok(
    client: AsyncClient, session: Session, city: City, organizer: User, admin: User, admin_token_headers
):
    slot = _make_slot(session, city=city)
    item = _make_item(session, slot=slot, user=organizer, admin=admin)

    response = await client.post(
        f"/api/admin/ad-items/{item.id}/image",
        files={"file": ("banner.png", TINY_PNG, "image/png")},
        headers=admin_token_headers,
    )

    assert response.status_code == 200
    assert response.json()["img_url"] != "https://example.com/b.jpg"


async def test_post_admin_ad_item_image_allows_gif(
    client: AsyncClient, session: Session, city: City, organizer: User, admin: User, admin_token_headers
):
    slot = _make_slot(session, city=city)
    item = _make_item(session, slot=slot, user=organizer, admin=admin)

    response = await client.post(
        f"/api/admin/ad-items/{item.id}/image",
        files={"file": ("banner.gif", TINY_GIF, "image/gif")},
        headers=admin_token_headers,
    )

    assert response.status_code == 200


async def test_post_admin_ad_item_image_too_large_returns_422(
    client: AsyncClient, session: Session, city: City, organizer: User, admin: User, admin_token_headers
):
    slot = _make_slot(session, city=city)
    item = _make_item(session, slot=slot, user=organizer, admin=admin)
    big_file = b"\x00" * (2 * 1024 * 1024 + 1)

    response = await client.post(
        f"/api/admin/ad-items/{item.id}/image",
        files={"file": ("banner.png", big_file, "image/png")},
        headers=admin_token_headers,
    )

    assert response.status_code == 422


# ── PUT /api/admin/ad-items/{id} ─────────────────────────────────────────


async def test_put_admin_ad_item_edits_fields(
    client: AsyncClient, session: Session, city: City, organizer: User, admin: User, admin_token_headers
):
    slot = _make_slot(session, city=city)
    item = _make_item(session, slot=slot, user=organizer, admin=admin)

    response = await client.put(
        f"/api/admin/ad-items/{item.id}",
        json={"link_url": "https://nuevo-link.com", "alt_text": "Nuevo texto"},
        headers=admin_token_headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["link_url"] == "https://nuevo-link.com"
    assert body["alt_text"] == "Nuevo texto"


# ── DELETE /api/admin/ad-items/{id} ──────────────────────────────────────


async def test_delete_admin_ad_item_returns_204(
    client: AsyncClient, session: Session, city: City, organizer: User, admin: User, admin_token_headers
):
    slot = _make_slot(session, city=city)
    item = _make_item(session, slot=slot, user=organizer, admin=admin)

    response = await client.delete(f"/api/admin/ad-items/{item.id}", headers=admin_token_headers)

    assert response.status_code == 204
    assert session.get(AdItem, item.id) is None


# ── PATCH /api/admin/ad-items/{id}/status ────────────────────────────────


async def test_patch_admin_ad_item_status_active_to_paused_and_back(
    client: AsyncClient, session: Session, city: City, organizer: User, admin: User, admin_token_headers
):
    slot = _make_slot(session, city=city)
    item = _make_item(session, slot=slot, user=organizer, admin=admin, status="active")

    paused = await client.patch(
        f"/api/admin/ad-items/{item.id}/status", json={"status": "paused"}, headers=admin_token_headers
    )
    assert paused.json()["status"] == "paused"

    active = await client.patch(
        f"/api/admin/ad-items/{item.id}/status", json={"status": "active"}, headers=admin_token_headers
    )
    assert active.json()["status"] == "active"


async def test_patch_admin_ad_item_status_expired_returns_400(
    client: AsyncClient, session: Session, city: City, organizer: User, admin: User, admin_token_headers
):
    slot = _make_slot(session, city=city)
    item = _make_item(session, slot=slot, user=organizer, admin=admin, status="active")

    response = await client.patch(
        f"/api/admin/ad-items/{item.id}/status", json={"status": "expired"}, headers=admin_token_headers
    )

    assert response.status_code == 400


# ── PATCH /api/admin/ad-items/reorder ────────────────────────────────────


async def test_patch_admin_ad_items_reorder_sequential_slot(
    client: AsyncClient, session: Session, city: City, organizer: User, admin: User, admin_token_headers
):
    slot = _make_slot(session, city=city, rotation_mode="sequential")
    item_a = _make_item(session, slot=slot, user=organizer, admin=admin, display_order=0)
    item_b = _make_item(session, slot=slot, user=organizer, admin=admin, display_order=1)

    response = await client.patch(
        "/api/admin/ad-items/reorder",
        json={"slot_id": str(slot.id), "ordered_ids": [str(item_b.id), str(item_a.id)]},
        headers=admin_token_headers,
    )

    assert response.status_code == 200
    session.refresh(item_a)
    session.refresh(item_b)
    assert item_b.display_order == 0
    assert item_a.display_order == 1


async def test_patch_admin_ad_items_reorder_random_slot_returns_400(
    client: AsyncClient, session: Session, city: City, organizer: User, admin: User, admin_token_headers
):
    slot = _make_slot(session, city=city, section="eventos-grid", rotation_mode="random")
    item = _make_item(session, slot=slot, user=organizer, admin=admin)

    response = await client.patch(
        "/api/admin/ad-items/reorder",
        json={"slot_id": str(slot.id), "ordered_ids": [str(item.id)]},
        headers=admin_token_headers,
    )

    assert response.status_code == 400
