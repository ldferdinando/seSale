"""add location_text to events (dirección libre, location_id nullable)

Revision ID: 3c7e9a1f5b28
Revises: 8a4f2b6c1d37
Create Date: 2026-10-07 12:00:00.000000

Tercer camino para la ubicación de un evento, además de elegir un Location
existente o marcarlo en el mapa: escribir la dirección como texto libre sin
crear ni vincular ningún Location.

- `events.location_text` (VARCHAR 500, nullable).
- `events.location_id` pasa a nullable.
- CHECK `ck_events_location_id_xor_location_text`: exactamente uno de los
  dos está seteado. Todas las filas existentes tienen location_id (era NOT
  NULL) y location_text NULL, así que lo cumplen sin backfill.

Sin modelos ORM, igual que el resto de las migraciones.
"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "3c7e9a1f5b28"
down_revision: Union[str, None] = "8a4f2b6c1d37"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_CHECK_NAME = "ck_events_location_id_xor_location_text"


def upgrade() -> None:
    with op.batch_alter_table("events", schema=None) as batch_op:
        batch_op.add_column(sa.Column("location_text", sa.String(length=500), nullable=True))
        batch_op.alter_column("location_id", existing_type=sqlmodel.sql.sqltypes.GUID(), nullable=True)
        batch_op.create_check_constraint(_CHECK_NAME, "(location_id IS NULL) <> (location_text IS NULL)")


def downgrade() -> None:
    # Falla si quedan eventos con location_text (location_id NULL): hay que
    # vincularlos a un Location antes de bajar la migración.
    with op.batch_alter_table("events", schema=None) as batch_op:
        batch_op.drop_constraint(_CHECK_NAME, type_="check")
        batch_op.alter_column("location_id", existing_type=sqlmodel.sql.sqltypes.GUID(), nullable=False)
        batch_op.drop_column("location_text")
