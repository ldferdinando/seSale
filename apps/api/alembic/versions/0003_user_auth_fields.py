"""user auth fields: hashed_password, refresh_token_hash

Revision ID: 3d7b6f1c9a2e
Revises: 8f3c1a9d2b4e
Create Date: 2026-07-31 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '3d7b6f1c9a2e'
down_revision: Union[str, None] = '8f3c1a9d2b4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # server_default='' solo es necesario para poder agregar la columna NOT
    # NULL sin romper filas ya existentes; no hace falta quitarlo después (el
    # ORM siempre manda un hashed_password explícito al crear un User). Evita
    # un op.alter_column extra, que en SQLite requeriría batch mode.
    op.add_column(
        'users',
        sa.Column(
            'hashed_password',
            sqlmodel.sql.sqltypes.AutoString(length=255),
            nullable=False,
            server_default='',
        ),
    )
    op.add_column(
        'users',
        sa.Column('refresh_token_hash', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
    )
    op.add_column(
        'users',
        sa.Column('refresh_token_expires_at', sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('users', 'refresh_token_expires_at')
    op.drop_column('users', 'refresh_token_hash')
    op.drop_column('users', 'hashed_password')
