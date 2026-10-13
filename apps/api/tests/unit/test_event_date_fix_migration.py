"""Tests de la migración 0036 — corrección de `date`/`date_end` guardados
como fecha UTC en vez del día de negocio en Argentina (ver a_revisar.md).

Se corre `_shift_dates` contra una tabla `events` mínima en SQLite, con un
contexto real de Alembic (`Operations.context`), sin el resto del esquema.
"""

import importlib.util
from datetime import date, datetime, time, timezone
from pathlib import Path
from uuid import uuid4

import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations

_MIGRATION_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "alembic"
    / "versions"
    / "0036_event_date_fix_optional_time_end_deleted_at.py"
)


def _load_migration():
    spec = importlib.util.spec_from_file_location("event_date_fix_migration", _MIGRATION_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


AFTER_BUG = datetime(2026, 9, 1, 12, 0, tzinfo=timezone.utc)
BEFORE_BUG = datetime(2026, 8, 1, 12, 0, tzinfo=timezone.utc)


def _run(rows: list[dict], days: int) -> dict:
    migration = _load_migration()
    engine = sa.create_engine("sqlite://")
    metadata = sa.MetaData()
    events = sa.Table(
        "events",
        metadata,
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("date", sa.Date()),
        sa.Column("time", sa.Time()),
        sa.Column("date_end", sa.Date()),
        sa.Column("time_end", sa.Time()),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )
    with engine.begin() as conn:
        metadata.create_all(conn)
        conn.execute(sa.insert(events), rows)
        with Operations.context(MigrationContext.configure(conn)):
            migration._shift_dates(days)
        result = conn.execute(sa.select(events)).all()
    return {row.id: row for row in result}


def test_night_event_saved_with_utc_date_moves_back_to_business_day():
    # Sáb 17/10 22:00–23:55 ART guardado con el bug: 18/10 01:00 / 18/10 02:55.
    event_id = uuid4()
    result = _run(
        [
            {
                "id": event_id,
                "date": date(2026, 10, 18),
                "time": time(1, 0),
                "date_end": date(2026, 10, 18),
                "time_end": time(2, 55),
                "created_at": AFTER_BUG,
            }
        ],
        -1,
    )
    assert result[event_id].date == date(2026, 10, 17)
    assert result[event_id].date_end == date(2026, 10, 17)


def test_crossmidnight_only_shifts_the_side_with_night_utc_hour():
    # Sáb 20:00 ART -> dom 01:00 ART: inicio 23:00 UTC (no se toca), fin
    # 04:00 UTC (>= 03:00, no se toca). Sáb 23:00 -> dom 00:30 ART: inicio
    # 02:00 UTC del 18 (se corrige al 17), fin 03:30 UTC del 18 (queda).
    late_start = uuid4()
    no_change = uuid4()
    result = _run(
        [
            {
                "id": no_change,
                "date": date(2026, 10, 17),
                "time": time(23, 0),
                "date_end": date(2026, 10, 18),
                "time_end": time(4, 0),
                "created_at": AFTER_BUG,
            },
            {
                "id": late_start,
                "date": date(2026, 10, 18),
                "time": time(2, 0),
                "date_end": date(2026, 10, 18),
                "time_end": time(3, 30),
                "created_at": AFTER_BUG,
            },
        ],
        -1,
    )
    assert result[no_change].date == date(2026, 10, 17)
    assert result[no_change].date_end == date(2026, 10, 18)
    assert result[late_start].date == date(2026, 10, 17)
    assert result[late_start].date_end == date(2026, 10, 18)


def test_rows_created_before_the_buggy_payload_are_untouched():
    event_id = uuid4()
    result = _run(
        [
            {
                "id": event_id,
                "date": date(2026, 8, 1),
                "time": time(1, 0),
                "date_end": date(2026, 8, 1),
                "time_end": time(2, 0),
                "created_at": BEFORE_BUG,
            }
        ],
        -1,
    )
    assert result[event_id].date == date(2026, 8, 1)


def test_null_time_end_is_ignored():
    event_id = uuid4()
    result = _run(
        [
            {
                "id": event_id,
                "date": date(2026, 10, 18),
                "time": time(1, 0),
                "date_end": date(2026, 10, 18),
                "time_end": None,
                "created_at": AFTER_BUG,
            }
        ],
        -1,
    )
    assert result[event_id].date == date(2026, 10, 17)
    assert result[event_id].date_end == date(2026, 10, 18)
