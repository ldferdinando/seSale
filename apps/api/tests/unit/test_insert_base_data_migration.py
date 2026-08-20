"""Etapa 9d — tests de la migración de datos base (0017_insert_base_data.py).

El nombre de archivo de la migración empieza con dígitos (convención de
Alembic) — no es un módulo importable con `import` normal, así que se carga
con `importlib` desde su path, igual que Alembic lo hace internamente. La
función testeada (`insert_base_data`) está extraída a nivel de módulo
justamente para poder llamarla con una Session de test (SQLite in-memory),
sin necesitar un contexto real de Alembic — ver el comentario en el propio
archivo de la migración.
"""

import importlib.util
from pathlib import Path

from sqlmodel import Session, select

from app.models.ad_slot import AdSlot
from app.models.city import City
from app.models.plan import Plan, PlanPrice, PlanType

_MIGRATION_PATH = (
    Path(__file__).resolve().parent.parent.parent / "alembic" / "versions" / "0017_insert_base_data.py"
)


def _load_migration():
    spec = importlib.util.spec_from_file_location("insert_base_data_migration", _MIGRATION_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_insert_base_data_runs_without_errors(session: Session):
    migration = _load_migration()

    migration.insert_base_data(session)


def test_insert_base_data_creates_6_cities(session: Session):
    migration = _load_migration()
    migration.insert_base_data(session)

    cities = session.exec(select(City)).all()
    assert len(cities) == 6
    names = {c.name for c in cities}
    assert names == {
        "General Roca",
        "Cipolletti",
        "Neuquén",
        "Allen",
        "Villa Regina",
        "Cinco Saltos",
    }

    roca = next(c for c in cities if c.name == "General Roca")
    assert roca.is_active is True
    assert roca.province == "Río Negro"

    neuquen = next(c for c in cities if c.name == "Neuquén")
    assert neuquen.is_active is False


def test_insert_base_data_creates_ad_slots_for_active_cities(session: Session):
    migration = _load_migration()
    migration.insert_base_data(session)

    slots = session.exec(select(AdSlot)).all()
    # 8 posiciones (eventos:3 + eventos-grid:2 + gastronomia:3) x 2 ciudades activas
    assert len(slots) == 16

    roca = session.exec(select(City).where(City.name == "General Roca")).one()
    roca_slots = [s for s in slots if s.city_id == roca.id]
    sections = {(s.section, s.slot_position) for s in roca_slots}
    assert sections == {
        ("eventos", 0),
        ("eventos", 1),
        ("eventos", 2),
        ("eventos-grid", 0),
        ("eventos-grid", 1),
        ("gastronomia", 0),
        ("gastronomia", 1),
        ("gastronomia", 2),
    }


def test_insert_base_data_creates_4_plans(session: Session):
    migration = _load_migration()
    migration.insert_base_data(session)

    plans = session.exec(select(Plan)).all()
    assert len(plans) == 4
    plan_types = {p.plan_type for p in plans}
    assert plan_types == {PlanType.gratis, PlanType.dest, PlanType.pro, PlanType.banner}


def test_insert_base_data_creates_placeholder_prices_for_dest_and_pro_only(session: Session):
    migration = _load_migration()
    migration.insert_base_data(session)

    prices = session.exec(select(PlanPrice)).all()
    assert len(prices) == 2
    for price in prices:
        assert price.amount == 0
        assert price.created_by is None
        assert price.valid_until is None


def test_insert_base_data_is_idempotent(session: Session):
    migration = _load_migration()

    migration.insert_base_data(session)
    migration.insert_base_data(session)

    assert len(session.exec(select(City)).all()) == 6
    assert len(session.exec(select(AdSlot)).all()) == 16
    assert len(session.exec(select(Plan)).all()) == 4
    assert len(session.exec(select(PlanPrice)).all()) == 2


def test_insert_base_data_does_not_duplicate_existing_city(session: Session):
    """Si la ciudad ya existe (creada por otra vía, ej. un seed manual),
    no se duplica — se reusa su id para los AdSlot."""
    existing = City(name="General Roca", province="Río Negro", is_active=True, sort_order=1)
    session.add(existing)
    session.commit()
    session.refresh(existing)

    migration = _load_migration()
    migration.insert_base_data(session)

    cities = session.exec(select(City).where(City.name == "General Roca")).all()
    assert len(cities) == 1
    assert cities[0].id == existing.id
