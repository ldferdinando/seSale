"""add created_by to users

Revision ID: be0b9777e512
Revises: 7c4a1e9f2b6d
Create Date: 2026-08-06 00:00:00.000000

Agrega `users.created_by` (UUID | None, FK a `users.id`): registra qué admin
creó la cuenta cuando el registro no lo hizo el propio usuario (flujo de
Etapa 5.6 donde el admin carga cuentas para clientes de banner). None ->
el usuario se registró solo.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'be0b9777e512'
down_revision: Union[str, None] = '7c4a1e9f2b6d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('created_by', sa.Uuid(), nullable=True))
        batch_op.create_foreign_key(
            'fk_users_created_by_users', 'users', ['created_by'], ['id']
        )


def downgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_constraint('fk_users_created_by_users', type_='foreignkey')
        batch_op.drop_column('created_by')
