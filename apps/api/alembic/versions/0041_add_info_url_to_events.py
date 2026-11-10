"""events: add info_url

Revision ID: 2d5a8f3c1b67
Revises: 7c1e4b9a2f30
Create Date: 2026-11-10 10:00:00.000000

Link externo opcional con el detalle completo del evento (cronograma,
actividades, etc.) cuando el organizador ya lo tiene publicado en otro lado
(su web, Instagram, Linktree) — ver EventDetailView y a_revisar.md.

Nullable, sin backfill: todos los eventos existentes quedan en NULL.
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2d5a8f3c1b67"
down_revision: Union[str, None] = "7c1e4b9a2f30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("events", schema=None) as batch_op:
        batch_op.add_column(sa.Column("info_url", sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("events", schema=None) as batch_op:
        batch_op.drop_column("info_url")
