"""events: fix business-day dates, optional time_end, soft delete

Revision ID: 9b4e1c7a2d63
Revises: 7d2f4a9c6e15
Create Date: 2026-10-13 12:00:00.000000

Tres cambios de la corrección urgente de producción (ver a_revisar.md):

1. `events.time_end` pasa a ser nullable (hora de fin opcional).
2. `events.deleted_at` (borrado lógico real). Antes "Eliminar" solo ponía
   `is_active=False`, el mismo flag que "Dar de baja"; un evento eliminado
   seguía listado y se podía "eliminar" de nuevo.
3. Corrección de datos — eventos guardados con la fecha UTC en vez del día
   de negocio en Argentina. Desde el fix de fechas del 24/08/2026 (commit
   7134a94, "Etapa 10d"), el frontend mandaba `date`/`date_end` como la
   fecha UTC del instante: para una hora ART >= 21:00 (hora UTC < 03:00)
   eso es el día siguiente — un evento del sábado 17/10 a las 22:00 quedaba
   guardado como domingo 18/10. El contrato del backend (core/timezone.py)
   es `date` = día de negocio ART, `time` = hora UTC: se resta un día a
   `date` cuando `time < 03:00` y a `date_end` cuando `time_end < 03:00`,
   solo para filas creadas a partir del 24/08/2026 00:00 ART (las
   anteriores se guardaron con el criterio correcto y además ya pasaron).

   No es reversible de forma exacta: el downgrade vuelve a sumar el día
   con el mismo criterio, para dejar los datos como estaban.

Sin modelos ORM, igual que el resto de las migraciones.
"""
from datetime import datetime, time, timedelta, timezone
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "9b4e1c7a2d63"
down_revision: Union[str, None] = "7d2f4a9c6e15"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# 24/08/2026 00:00 ART = 03:00 UTC — deploy del fix que empezó a mandar la
# fecha UTC.
_BUGGY_PAYLOAD_SINCE = datetime(2026, 8, 24, 3, 0, tzinfo=timezone.utc)
# 00:00 ART en UTC: horas UTC menores son la noche (21:00–23:59 ART) del
# día de negocio anterior.
_ART_DAY_START_UTC = time(3, 0)

_events = sa.table(
    "events",
    sa.column("id", sa.Uuid()),
    sa.column("date", sa.Date()),
    sa.column("time", sa.Time()),
    sa.column("date_end", sa.Date()),
    sa.column("time_end", sa.Time()),
    sa.column("created_at", sa.DateTime(timezone=True)),
)


def _shift_dates(days: int) -> None:
    bind = op.get_bind()
    rows = bind.execute(
        sa.select(_events.c.id, _events.c.date, _events.c.time, _events.c.date_end, _events.c.time_end).where(
            _events.c.created_at >= _BUGGY_PAYLOAD_SINCE
        )
    ).all()
    for row in rows:
        values: dict[str, object] = {}
        if row.time is not None and row.time < _ART_DAY_START_UTC:
            values["date"] = row.date + timedelta(days=days)
        if row.date_end is not None and row.time_end is not None and row.time_end < _ART_DAY_START_UTC:
            values["date_end"] = row.date_end + timedelta(days=days)
        if values:
            bind.execute(sa.update(_events).where(_events.c.id == row.id).values(**values))


def upgrade() -> None:
    with op.batch_alter_table("events", schema=None) as batch_op:
        batch_op.alter_column("time_end", existing_type=sa.Time(), nullable=True)
        batch_op.add_column(sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))

    _shift_dates(-1)


def downgrade() -> None:
    _shift_dates(1)

    # Las filas sin hora de fin vuelven al backfill de la migración 0018
    # (23:59 ART = 02:59 UTC) antes de restaurar el NOT NULL.
    op.execute(sa.update(_events).where(_events.c.time_end.is_(None)).values(time_end=time(2, 59)))
    with op.batch_alter_table("events", schema=None) as batch_op:
        batch_op.drop_column("deleted_at")
        batch_op.alter_column("time_end", existing_type=sa.Time(), nullable=False)
