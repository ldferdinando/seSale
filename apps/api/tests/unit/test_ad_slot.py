"""Tests del modelo AdSlot/AdItem rediseñado (Etapa 8d-pre) y su vencimiento
automático (app/core/expiry.py:expire_overdue_ad_items).

Modelo puro (sin endpoints/schemas todavía — esta etapa es solo modelo y
migración, ver a_revisar.md)."""

from datetime import date, timedelta
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.core.expiry import expire_overdue_ad_items
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


def test_create_ad_slot_ok(session: Session, city: City):
    slot = _make_slot(session, city=city, section="eventos", slot_position=0)

    assert slot.id is not None
    assert slot.section == "eventos"
    assert slot.slot_position == 0
    assert slot.rotation_mode == "sequential"
    assert slot.rotation_interval_seconds == 3
    assert slot.is_active is True


def test_ad_slot_unique_constraint_same_section_and_position_raises(session: Session, city: City):
    _make_slot(session, city=city, section="eventos", slot_position=0)

    with pytest.raises(IntegrityError):
        _make_slot(session, city=city, section="eventos", slot_position=0)


def test_ad_slot_unique_constraint_allows_same_position_different_section(session: Session, city: City):
    _make_slot(session, city=city, section="eventos", slot_position=0)
    # No debe lanzar: mismo slot_position, distinta section.
    other = _make_slot(session, city=city, section="gastronomia", slot_position=0)

    assert other.id is not None


def test_create_ad_item_with_user_and_created_by(session: Session, city: City, organizer: User, admin: User):
    slot = _make_slot(session, city=city)

    item = AdItem(
        slot_id=slot.id,
        user_id=organizer.id,
        img_url="https://example.com/banner.jpg",
        created_by=admin.id,
    )
    session.add(item)
    session.commit()
    session.refresh(item)

    assert item.id is not None
    assert item.user_id == organizer.id
    assert item.created_by == admin.id
    assert item.status == "active"


def test_ad_item_starts_and_ends_at_define_validity_window(session: Session, city: City, organizer: User, admin: User):
    slot = _make_slot(session, city=city)
    starts = date.today()
    ends = date.today() + timedelta(days=30)

    item = AdItem(
        slot_id=slot.id,
        user_id=organizer.id,
        img_url="https://example.com/banner.jpg",
        created_by=admin.id,
        starts_at=starts,
        ends_at=ends,
    )
    session.add(item)
    session.commit()
    session.refresh(item)

    assert item.starts_at == starts
    assert item.ends_at == ends


def test_ad_item_ends_at_none_is_indefinitely_valid(session: Session, city: City, organizer: User, admin: User):
    slot = _make_slot(session, city=city)

    item = AdItem(
        slot_id=slot.id,
        user_id=organizer.id,
        img_url="https://example.com/banner.jpg",
        created_by=admin.id,
        ends_at=None,
    )
    session.add(item)
    session.commit()
    session.refresh(item)

    assert item.ends_at is None


def test_expire_overdue_ad_items_marks_expired(session: Session, city: City, organizer: User, admin: User):
    slot = _make_slot(session, city=city)
    item = AdItem(
        slot_id=slot.id,
        user_id=organizer.id,
        img_url="https://example.com/banner.jpg",
        created_by=admin.id,
        status="active",
        ends_at=date.today() - timedelta(days=1),
    )
    session.add(item)
    session.commit()

    expired = expire_overdue_ad_items(session)

    assert len(expired) == 1
    session.refresh(item)
    assert item.status == "expired"


def test_expire_overdue_ad_items_leaves_valid_items_untouched(session: Session, city: City, organizer: User, admin: User):
    slot = _make_slot(session, city=city)
    item = AdItem(
        slot_id=slot.id,
        user_id=organizer.id,
        img_url="https://example.com/banner.jpg",
        created_by=admin.id,
        status="active",
        ends_at=date.today() + timedelta(days=1),
    )
    session.add(item)
    session.commit()

    expired = expire_overdue_ad_items(session)

    assert len(expired) == 0
    session.refresh(item)
    assert item.status == "active"


def test_expire_overdue_ad_items_is_idempotent(session: Session, city: City, organizer: User, admin: User):
    slot = _make_slot(session, city=city)
    item = AdItem(
        slot_id=slot.id,
        user_id=organizer.id,
        img_url="https://example.com/banner.jpg",
        created_by=admin.id,
        status="active",
        ends_at=date.today() - timedelta(days=1),
    )
    session.add(item)
    session.commit()

    first_run = expire_overdue_ad_items(session)
    second_run = expire_overdue_ad_items(session)

    assert len(first_run) == 1
    assert len(second_run) == 0


async def test_get_events_triggers_expire_overdue_ad_items_in_background(client: AsyncClient):
    with patch("app.routers.events.run_expire_overdue_ad_items_task") as mock_task:
        response = await client.get("/api/events")

    assert response.status_code == 200
    mock_task.assert_called_once()


def test_ad_slot_has_many_ad_items(session: Session, city: City, organizer: User, admin: User):
    slot = _make_slot(session, city=city)
    for _ in range(2):
        session.add(
            AdItem(
                slot_id=slot.id,
                user_id=organizer.id,
                img_url="https://example.com/banner.jpg",
                created_by=admin.id,
            )
        )
    session.commit()
    session.refresh(slot)

    assert len(slot.items) == 2


def test_ad_item_requires_user_id(session: Session, city: City, admin: User):
    slot = _make_slot(session, city=city)
    item = AdItem(
        slot_id=slot.id,
        user_id=None,  # type: ignore[arg-type]
        img_url="https://example.com/banner.jpg",
        created_by=admin.id,
    )
    session.add(item)

    with pytest.raises(IntegrityError):
        session.commit()


def test_ad_item_requires_created_by(session: Session, city: City, organizer: User):
    slot = _make_slot(session, city=city)
    item = AdItem(
        slot_id=slot.id,
        user_id=organizer.id,
        img_url="https://example.com/banner.jpg",
        created_by=None,  # type: ignore[arg-type]
    )
    session.add(item)

    with pytest.raises(IntegrityError):
        session.commit()


def test_seed_creates_8_ad_slots_per_city():
    """El seed (seed.py) crea 8 AdSlot por ciudad: 3 eventos (sequential) +
    2 eventos-grid (random) + 3 gastronomia (sequential)."""
    from seed import _ad_slots_for_city

    fake_city_id = "00000000-0000-0000-0000-000000000000"
    slots = _ad_slots_for_city(fake_city_id)

    assert len(slots) == 8
    by_section: dict[str, list[AdSlot]] = {}
    for slot in slots:
        by_section.setdefault(slot.section, []).append(slot)

    assert sorted(s.slot_position for s in by_section["eventos"]) == [0, 1, 2]
    assert all(s.rotation_mode == "sequential" for s in by_section["eventos"])

    assert sorted(s.slot_position for s in by_section["eventos-grid"]) == [0, 1]
    assert all(s.rotation_mode == "random" for s in by_section["eventos-grid"])

    assert sorted(s.slot_position for s in by_section["gastronomia"]) == [0, 1, 2]
    assert all(s.rotation_mode == "sequential" for s in by_section["gastronomia"])

    assert all(s.is_active is True for s in slots)
