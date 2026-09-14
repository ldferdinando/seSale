"""add_gastro_facebook_and_phone_to_locations

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-09-13 10:00:00.000000

Etapa "Ficha de Lugar v2.2" — dos campos de contacto opcionales nuevos para
Location, siguiendo el mismo patrón que gastro_whatsapp/gastro_instagram/
gastro_web/gastro_email (migración 0014) y que Event.contact_facebook
(migración 0022, Etapa 12a):

- gastro_facebook: link/nombre de página de Facebook del lugar.
- gastro_phone: teléfono público del lugar (distinto de User.phone, que es
  privado y solo se usa para verificación de identidad del organizador).
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d5e6f7a8b9c0"
down_revision: Union[str, None] = "c4d5e6f7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("locations", schema=None) as batch_op:
        batch_op.add_column(sa.Column("gastro_facebook", sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column("gastro_phone", sa.String(length=50), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("locations", schema=None) as batch_op:
        batch_op.drop_column("gastro_phone")
        batch_op.drop_column("gastro_facebook")
