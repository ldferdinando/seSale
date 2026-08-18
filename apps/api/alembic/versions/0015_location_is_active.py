"""location_is_active_and_created_at

Revision ID: a1b2c3d4e5f6
Revises: f6a7b8c9d0e1
Create Date: 2026-08-17 00:00:00.000000

Etapa 8e — dos huecos encontrados al planificar (ver a_revisar.md):
`Location` no tenía `is_active` (el pedido necesita poder "deshabilitar" un
lugar gastronómico sin borrarlo — oculto de GET /api/gastro, sigue
existiendo para editar/reactivar) ni `created_at` (LocationGastroAdminRead
lo expone al panel admin). Ambos con default retrocompatible — no cambian
el comportamiento de los `Location` existentes (lugares de eventos).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0f1e2d3c4b5a'
down_revision: Union[str, None] = 'f6a7b8c9d0e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('locations', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true())
        )
        batch_op.add_column(
            sa.Column(
                'created_at',
                sa.DateTime(),
                nullable=False,
                server_default=sa.text('CURRENT_TIMESTAMP'),
            )
        )

    with op.batch_alter_table('locations', schema=None) as batch_op:
        batch_op.alter_column('is_active', server_default=None)
        batch_op.alter_column('created_at', server_default=None)


def downgrade() -> None:
    with op.batch_alter_table('locations', schema=None) as batch_op:
        batch_op.drop_column('created_at')
        batch_op.drop_column('is_active')
