"""Tests de app/schemas/ad_slot.py::AdSlotCreate — Etapa 13b.

No hay endpoint público que reciba este schema (los AdSlot los crea el
sistema, ver app/services/ad_service.py) — se testea directamente, igual que
se testearía la validación de un endpoint que lo usara como body."""

import pytest
from pydantic import ValidationError

from app.schemas.ad_slot import AdSlotCreate

CITY_ID = "11111111-1111-1111-1111-111111111111"


def test_ad_slot_create_categoria_wide_with_category_key_is_valid():
    slot = AdSlotCreate(city_id=CITY_ID, section="categoria-wide", slot_position=0, category_key="musica")

    assert slot.category_key == "musica"


def test_ad_slot_create_categoria_grid_with_category_key_is_valid():
    slot = AdSlotCreate(city_id=CITY_ID, section="categoria-grid", slot_position=0, category_key="teatro")

    assert slot.category_key == "teatro"


def test_ad_slot_create_categoria_wide_without_category_key_is_valid():
    slot = AdSlotCreate(city_id=CITY_ID, section="categoria-wide", slot_position=0)

    assert slot.category_key is None


@pytest.mark.parametrize("section", ["eventos", "eventos-grid", "gastronomia"])
def test_ad_slot_create_non_category_section_with_category_key_raises(section: str):
    with pytest.raises(ValidationError):
        AdSlotCreate(city_id=CITY_ID, section=section, slot_position=0, category_key="musica")


@pytest.mark.parametrize("section", ["eventos", "eventos-grid", "gastronomia"])
def test_ad_slot_create_non_category_section_without_category_key_is_valid(section: str):
    slot = AdSlotCreate(city_id=CITY_ID, section=section, slot_position=0)

    assert slot.category_key is None
