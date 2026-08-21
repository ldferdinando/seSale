"""make_time_end_required_on_events

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
Create Date: 2026-08-20 12:00:00.000000

Etapa 10a — `Event.time_end` pasa de opcional a obligatorio.

Antes de poner la columna NOT NULL, hay que backfillear las filas
existentes con `time_end IS NULL` (eventos cargados antes de esta etapa,
`seSALE_primario.html` no tenía hora de fin). Regla acordada con la
usuaria: `time_end = time_start + 2 horas`; si esa suma cruza la
medianoche (ej. 23:00 + 2h = 01:00 del día siguiente), se usa `23:59` como
valor seguro en vez de la hora "cruzada" — evita tener que decidir acá
mismo si ese evento pasa a considerarse "cruza medianoche" sin que nadie
lo haya cargado así a propósito.

Idempotente: el `UPDATE`/backfill solo toca filas con `time_end IS NULL`
(no quedan después de la primera corrida) y el `ALTER COLUMN ... SET NOT
NULL` no falla si ya no hay nulls — correr esta migración dos veces no
cambia nada la segunda vez.

Cálculo hecho en Python (no SQL) — mismo criterio que
`0007_multiple_categories_and_moments.py` (recalcular con la lógica real
de la app en vez de reimplementarla en SQL) — para que el comportamiento
sea idéntico en SQLite (tests) y Postgres (dev/prod).
"""
from datetime import datetime, time, timedelta
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c2d3e4f5a6b7"
down_revision: Union[str, None] = "b1c2d3e4f5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_FALLBACK_END = time(23, 59)


def _backfilled_time_end(time_start: time) -> time:
    """time_start + 2h, o 23:59 si esa suma cruza la medianoche."""
    reference = datetime.combine(datetime.min, time_start)
    candidate = (reference + timedelta(hours=2)).time()
    if candidate < time_start:
        return _FALLBACK_END
    return candidate


def upgrade() -> None:
    connection = op.get_bind()

    rows = connection.execute(sa.text("SELECT id, time FROM events WHERE time_end IS NULL")).fetchall()
    for event_id, event_time in rows:
        connection.execute(
            sa.text("UPDATE events SET time_end = :time_end WHERE id = :event_id"),
            {"time_end": _backfilled_time_end(event_time), "event_id": event_id},
        )

    with op.batch_alter_table("events", schema=None) as batch_op:
        batch_op.alter_column("time_end", existing_type=sa.Time(), nullable=False)


def downgrade() -> None:
    with op.batch_alter_table("events", schema=None) as batch_op:
        batch_op.alter_column("time_end", existing_type=sa.Time(), nullable=True)
