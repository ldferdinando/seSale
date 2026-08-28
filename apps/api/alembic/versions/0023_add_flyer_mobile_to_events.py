"""add_flyer_mobile_to_events

Revision ID: b3c4d5e6f7a8
Revises: a2b3c4d5e6f7
Create Date: 2026-08-28 10:00:00.000000

Etapa 12b — flyer dual mobile/desktop en eventos.

1. Renombra la columna `events.flyer_url` a `events.flyer_url_desktop` — es
   un rename directo (`alter_column ... new_column_name`), NO drop+add: los
   eventos que ya tenían un flyer conservan su valor en la columna nueva.
2. Agrega `events.flyer_url_mobile`, nullable. Las filas existentes quedan
   con `NULL` — al mostrar, si solo hay desktop se usa para todas las
   resoluciones (Opción A confirmada, ver ARCHITECTURE.md § Event).
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b3c4d5e6f7a8"
down_revision: Union[str, None] = "a2b3c4d5e6f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("events", schema=None) as batch_op:
        batch_op.alter_column(
            "flyer_url",
            new_column_name="flyer_url_desktop",
            existing_type=sa.String(),
            existing_nullable=True,
        )
        batch_op.add_column(sa.Column("flyer_url_mobile", sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("events", schema=None) as batch_op:
        batch_op.drop_column("flyer_url_mobile")
        batch_op.alter_column(
            "flyer_url_desktop",
            new_column_name="flyer_url",
            existing_type=sa.String(),
            existing_nullable=True,
        )
