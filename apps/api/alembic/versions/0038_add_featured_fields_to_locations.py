"""locations: add featured_from and featured_banner_url

Revision ID: 4f8c2a7e9d16
Revises: 2e5f8a1c4b7d
Create Date: 2026-10-14 10:00:00.000000

Completa el mecanismo de "destacado temporal" de Location (Etapa "Lugares
destacados temporales"). `plan`/`featured_until` ya existían (Etapa 8e-pre);
esta migración agrega:

- `featured_from`: desde cuándo está vigente el plan pago actual (antes no
  existía — el admin no podía fijar un inicio, solo el vencimiento).
- `featured_banner_url`: imagen exclusiva del plan "pro", análoga a
  `cover_img_url` pero solo para Destacado Plus.

Ambas columnas nullable sin backfill: todas las filas existentes quedan en
NULL (un lugar con `plan` ya en "dest"/"pro" simplemente no tiene fecha de
inicio ni banner hasta que el admin los cargue de nuevo desde el panel).
VARCHAR simple para featured_banner_url (no Enum, no aplica): mismo patrón
de almacenamiento que cover_img_url/flyer_url.

Sin modelos ORM, igual que el resto de las migraciones.
"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "4f8c2a7e9d16"
down_revision: Union[str, None] = "2e5f8a1c4b7d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("locations", schema=None) as batch_op:
        batch_op.add_column(sa.Column("featured_from", sa.DateTime(), nullable=True))
        batch_op.add_column(
            sa.Column("featured_banner_url", sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True)
        )


def downgrade() -> None:
    with op.batch_alter_table("locations", schema=None) as batch_op:
        batch_op.drop_column("featured_banner_url")
        batch_op.drop_column("featured_from")
