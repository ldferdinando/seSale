"""Etapa 10a — tests de la migración 0018_make_time_end_required_on_events.py.

Igual que `0017_insert_base_data.py` (ver `test_insert_base_data_migration.py`),
el nombre del archivo empieza con dígitos — no es un módulo importable con
`import` normal, se carga con `importlib` desde su path.

Esta migración es principalmente DDL (`ALTER COLUMN ... SET NOT NULL` vía
`op.batch_alter_table`, que necesita un contexto real de Alembic/conexión, no
solo una `Session` de SQLModel) — a diferencia de `0017` (migración de datos
pura), acá se testea directamente la función de cálculo del backfill
(`_backfilled_time_end`, 100% de la lógica de negocio pedida: "time_start + 2h,
o 23:59 si eso cruza medianoche"), que es pura y no necesita DB. El DDL en sí
(`ALTER COLUMN`, idempotencia de correr `alembic upgrade head` dos veces) se
verifica corriendo la migración real contra Postgres (igual que hace
`ci-backend.yml`), no con pytest — mismo criterio que las migraciones de
esquema anteriores (`0015`, `0016`), que tampoco tienen un test de DDL en
pytest.
"""

import importlib.util
from datetime import time
from pathlib import Path

_MIGRATION_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "alembic"
    / "versions"
    / "0018_make_time_end_required_on_events.py"
)


def _load_migration():
    spec = importlib.util.spec_from_file_location("make_time_end_required_migration", _MIGRATION_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_backfill_adds_two_hours_when_it_does_not_cross_midnight():
    migration = _load_migration()

    assert migration._backfilled_time_end(time(11, 0)) == time(13, 0)
    assert migration._backfilled_time_end(time(20, 30)) == time(22, 30)


def test_backfill_falls_back_to_23_59_when_two_hours_crosses_midnight():
    migration = _load_migration()

    # 23:00 + 2h = 01:00 del día siguiente -> cruza medianoche -> 23:59
    assert migration._backfilled_time_end(time(23, 0)) == time(23, 59)
    assert migration._backfilled_time_end(time(22, 30)) == time(23, 59)


def test_backfill_exact_boundary_does_not_cross_midnight():
    """22:00 + 2h = 00:00 exacto — el resultado (00:00) es MENOR que
    time_start (22:00), así que también cuenta como "cruza" según la regla
    (`candidate < time_start`) y usa el fallback seguro."""
    migration = _load_migration()

    assert migration._backfilled_time_end(time(22, 0)) == time(23, 59)


def test_backfill_is_a_pure_function_same_input_same_output():
    """Corolario de que sea pura: correrla dos veces con el mismo input da
    el mismo resultado — la migración que la usa (UPDATE ... WHERE time_end
    IS NULL) es idempotente porque después de la primera corrida no quedan
    filas con time_end NULL para volver a tocar."""
    migration = _load_migration()

    first = migration._backfilled_time_end(time(21, 0))
    second = migration._backfilled_time_end(time(21, 0))
    assert first == second == time(23, 0)
