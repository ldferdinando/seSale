from datetime import datetime, timezone

import pytest
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.models import City, Location, LocationGastroType
from seed import _gastro_locations_for_city

OPENING_HOURS = {
    "lunes": None,
    "martes": {"open": "20:00", "close": "02:00"},
    "miercoles": {"open": "20:00", "close": "02:00"},
    "jueves": {"open": "20:00", "close": "02:00"},
    "viernes": {"open": "20:00", "close": "03:00"},
    "sabado": {"open": "20:00", "close": "03:00"},
    "domingo": None,
}


def test_locations_table_has_gastro_columns(session: Session):
    inspector = inspect(session.get_bind())

    columns = {col["name"] for col in inspector.get_columns("locations")}
    assert {
        "is_gastro",
        "plan",
        "featured_until",
        "opening_hours",
        "gastro_whatsapp",
        "gastro_instagram",
        "gastro_web",
        "gastro_email",
        "has_delivery",
        "has_reservations",
        "price_range",
        "cover_img_url",
    }.issubset(columns)


def test_location_gastro_types_table_exists(session: Session):
    inspector = inspect(session.get_bind())

    assert inspector.has_table("location_gastro_types")
    columns = {col["name"] for col in inspector.get_columns("location_gastro_types")}
    assert columns == {"location_id", "gastro_type"}


def test_location_with_is_gastro_true_can_be_created_and_read(session: Session, city: City):
    location = Location(
        name="El Tinglado Bar",
        address="Av. Julio A. Roca 1240",
        city_id=city.id,
        is_gastro=True,
        plan="dest",
        opening_hours=OPENING_HOURS,
        gastro_whatsapp="5492984000001",
    )
    session.add(location)
    session.commit()
    session.refresh(location)

    fetched = session.get(Location, location.id)
    assert fetched.is_gastro is True
    assert fetched.plan == "dest"
    assert fetched.gastro_whatsapp == "5492984000001"


def test_location_with_multiple_gastro_types_saves_both(session: Session, city: City):
    location = Location(name="Cervecería del Valle", address="San Martín 890", city_id=city.id, is_gastro=True)
    session.add(location)
    session.commit()
    session.refresh(location)

    session.add(LocationGastroType(location_id=location.id, gastro_type="bar"))
    session.add(LocationGastroType(location_id=location.id, gastro_type="cerveceria"))
    session.commit()

    types = session.exec(
        select(LocationGastroType).where(LocationGastroType.location_id == location.id)
    ).all()
    assert {t.gastro_type for t in types} == {"bar", "cerveceria"}


def test_location_gastro_type_rejects_duplicate_pk(session: Session, city: City):
    location = Location(name="Café del Centro", address="Isidro Lobo 234", city_id=city.id, is_gastro=True)
    session.add(location)
    session.commit()
    session.refresh(location)

    session.add(LocationGastroType(location_id=location.id, gastro_type="cafe"))
    session.commit()

    session.add(LocationGastroType(location_id=location.id, gastro_type="cafe"))
    with pytest.raises(IntegrityError):
        session.commit()
    session.rollback()


def test_opening_hours_json_round_trip(session: Session, city: City):
    location = Location(
        name="La Toscana", address="Belgrano 543", city_id=city.id, opening_hours=OPENING_HOURS
    )
    session.add(location)
    session.commit()
    session.refresh(location)

    fetched = session.get(Location, location.id)
    assert fetched.opening_hours == OPENING_HOURS
    assert fetched.opening_hours["martes"] == {"open": "20:00", "close": "02:00"}
    assert fetched.opening_hours["lunes"] is None


def test_location_with_is_gastro_false_has_no_gastro_data(session: Session, city: City):
    location = Location(name="Predio Ferial", address="Ruta 22 km 1210", city_id=city.id)
    session.add(location)
    session.commit()
    session.refresh(location)

    fetched = session.get(Location, location.id)
    assert fetched.is_gastro is False
    assert fetched.plan == "gratis"
    assert fetched.featured_until is None
    assert fetched.opening_hours is None
    assert fetched.has_delivery is False
    assert fetched.has_reservations is False
    assert fetched.price_range is None
    assert fetched.cover_img_url is None

    types = session.exec(
        select(LocationGastroType).where(LocationGastroType.location_id == location.id)
    ).all()
    assert types == []


def test_gastro_locations_for_city_is_testable_without_db_session(city: City):
    """Mismo patrón que _ad_slots_for_city: función pura, sin sesión de DB."""
    data = _gastro_locations_for_city(city.id)

    assert len(data) == 5
    names = {d["name"] for d in data}
    assert names == {
        "El Tinglado Bar",
        "La Toscana",
        "Cervecería del Valle",
        "Café del Centro",
        "Don Asado Parrilla",
    }
    for d in data:
        assert d["city_id"] == city.id
        assert d["is_gastro"] is True
        assert isinstance(d["gastro_types"], list)
        assert len(d["gastro_types"]) >= 1

    tinglado = next(d for d in data if d["name"] == "El Tinglado Bar")
    assert tinglado["gastro_types"] == ["bar", "cerveceria"]
    assert tinglado["plan"] == "dest"

    cerveceria = next(d for d in data if d["name"] == "Cervecería del Valle")
    assert cerveceria["featured_until"] == datetime(2025, 12, 31, 23, 59, 59, tzinfo=timezone.utc)


def test_seed_creates_five_gastro_locations_for_general_roca():
    import uuid

    fake_city_id = uuid.uuid4()
    data = _gastro_locations_for_city(fake_city_id)

    assert len(data) == 5
    assert all(d["is_gastro"] for d in data)


def test_seed_updates_existing_el_tinglado_bar_instead_of_duplicating(session: Session, city: City):
    """El seed real busca "El Tinglado Bar" entre los lugares precargados ya
    creados (mismo name + city_id) y lo actualiza in-place — nunca crea un
    segundo registro con ese nombre en la misma ciudad."""
    existing = Location(
        name="El Tinglado Bar",
        address="Av. Julio A. Roca 1240, General Roca",
        city_id=city.id,
        place_type="bar",
        is_public=True,
        is_verified=True,
    )
    session.add(existing)
    session.commit()
    session.refresh(existing)

    gastro_data = next(
        d for d in _gastro_locations_for_city(city.id) if d["name"] == "El Tinglado Bar"
    )
    gastro_data = dict(gastro_data)
    gastro_data.pop("gastro_types")
    for field, value in gastro_data.items():
        if field in ("name", "address", "city_id"):
            continue
        setattr(existing, field, value)
    session.add(existing)
    session.commit()

    all_tinglados = session.exec(
        select(Location).where(Location.name == "El Tinglado Bar", Location.city_id == city.id)
    ).all()
    assert len(all_tinglados) == 1
    assert all_tinglados[0].is_gastro is True
    assert all_tinglados[0].is_public is True  # no se pisó al actualizar
