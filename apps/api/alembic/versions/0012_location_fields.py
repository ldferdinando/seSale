"""add description/hours/place_type/is_verified/is_public to locations

Revision ID: d1e2f3a4b5c6
Revises: c9d0e1f2a3b4
Create Date: 2026-08-13 00:00:00.000000

Etapa 7b — lugares precargados y mapa. Agrega los campos pendientes de
`Location` (ver `a_revisar.md`, Etapa 4): descripción y horario de
atención en texto libre, tipo de lugar (sin enum, sugerido en el
frontend), y el par `is_verified`/`is_public` que distingue lugares
oficiales precargados por el admin (`is_public=True`) de ubicaciones
creadas automáticamente por un organizador con dirección libre
(`is_public=False`). Todos los `Location` existentes quedan con
`is_verified=False`/`is_public=False` — no son lugares precargados.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, None] = 'c9d0e1f2a3b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('locations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('description', sa.String(length=1000), nullable=True))
        batch_op.add_column(sa.Column('hours', sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column('place_type', sa.String(length=50), nullable=True))
        batch_op.add_column(
            sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.false())
        )
        batch_op.add_column(
            sa.Column('is_public', sa.Boolean(), nullable=False, server_default=sa.false())
        )

    # server_default solo hacía falta para backfillar las filas existentes —
    # el modelo define el default en Python (mismo patrón que otras
    # migraciones de este proyecto, ej. `is_active` en 0001).
    with op.batch_alter_table('locations', schema=None) as batch_op:
        batch_op.alter_column('is_verified', server_default=None)
        batch_op.alter_column('is_public', server_default=None)


def downgrade() -> None:
    with op.batch_alter_table('locations', schema=None) as batch_op:
        batch_op.drop_column('is_public')
        batch_op.drop_column('is_verified')
        batch_op.drop_column('place_type')
        batch_op.drop_column('hours')
        batch_op.drop_column('description')
