"""events: add instance_group_id

Revision ID: 9b3e7f1c6a04
Revises: 4f8c2a7e9d16
Create Date: 2026-10-19 10:00:00.000000

Feature "Duplicar evento": vínculo liviano entre eventos duplicados entre sí
(ej. distintas funciones de una obra de teatro, distintos días de un
festival) — no se construye el modelo grande de "un evento con varias
fechas" (ver a_revisar.md), solo una referencia de agrupación.

`instance_group_id` nullable, sin backfill: todos los eventos existentes
quedan en NULL (nunca fueron duplicados). Se asigna recién cuando alguien
duplica un evento por primera vez — ahí el original también lo recibe (pasa
a ser "Instancia 1" de su propio grupo), ver
`app.services.event_service.duplicate_event`. El número de instancia no se
guarda como columna: se calcula por orden de `created_at` dentro del mismo
`instance_group_id`.
"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "9b3e7f1c6a04"
down_revision: Union[str, None] = "4f8c2a7e9d16"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("events", schema=None) as batch_op:
        batch_op.add_column(sa.Column("instance_group_id", sqlmodel.sql.sqltypes.GUID(), nullable=True))
        batch_op.create_index(op.f("ix_events_instance_group_id"), ["instance_group_id"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("events", schema=None) as batch_op:
        batch_op.drop_index(op.f("ix_events_instance_group_id"))
        batch_op.drop_column("instance_group_id")
