"""add_location_id_to_reports

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-09-13 10:05:00.000000

Etapa "Ficha de Lugar v2.2" — generaliza `reports` (Etapa 6.5, antes solo
para eventos) para poder reportar también un lugar gastronómico:

- `event_id` pasa a ser nullable (antes obligatorio).
- se agrega `location_id` (nullable, FK a `locations.id`, indexado igual
  que `event_id`).

Exactamente uno de los dos está seteado en cada fila — se valida en
app.services.report_service (create_report/create_location_report), no con
un CHECK constraint a nivel de base (evita divergencia de comportamiento
entre SQLite —usado en tests— y Postgres).
"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e6f7a8b9c0d1"
down_revision: Union[str, None] = "d5e6f7a8b9c0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("reports", schema=None) as batch_op:
        batch_op.add_column(sa.Column("location_id", sqlmodel.sql.sqltypes.GUID(), nullable=True))
        batch_op.alter_column("event_id", existing_type=sqlmodel.sql.sqltypes.GUID(), nullable=True)
        batch_op.create_foreign_key(
            "fk_reports_location_id_locations", "locations", ["location_id"], ["id"]
        )
        batch_op.create_index(op.f("ix_reports_location_id"), ["location_id"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("reports", schema=None) as batch_op:
        batch_op.drop_index(op.f("ix_reports_location_id"))
        batch_op.drop_constraint("fk_reports_location_id_locations", type_="foreignkey")
        batch_op.alter_column("event_id", existing_type=sqlmodel.sql.sqltypes.GUID(), nullable=False)
        batch_op.drop_column("location_id")
