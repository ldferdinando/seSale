"""add_date_end_to_events

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-08-21 10:00:00.000000

Etapa 10b — `events.date_end`, columna nueva, nullable, retrocompatible.

`None` significa "mismo día que `date`" — no hace falta backfillear las
filas existentes (a diferencia de la migración `0018` de `time_end`, que sí
necesitaba backfill porque la columna pasaba a NOT NULL). El backend
siempre trata `date_end IS NULL` como `date_end = date` (ver
`EventRead.date_end` en `app/schemas/event.py` y `is_event_currently_visible`
en `app/services/event_service.py`) — nunca se lee `date_end` crudo sin
pasar por ese fallback.
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d3e4f5a6b7c8"
down_revision: Union[str, None] = "c2d3e4f5a6b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("events", schema=None) as batch_op:
        batch_op.add_column(sa.Column("date_end", sa.Date(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("events", schema=None) as batch_op:
        batch_op.drop_column("date_end")
