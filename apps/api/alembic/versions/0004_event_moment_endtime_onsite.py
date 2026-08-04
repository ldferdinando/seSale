"""event moment, time_end, available_on_site

Revision ID: 6a1c8e2f4d7b
Revises: 3d7b6f1c9a2e
Create Date: 2026-08-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '6a1c8e2f4d7b'
down_revision: Union[str, None] = '3d7b6f1c9a2e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('events', sa.Column('time_end', sa.Time(), nullable=True))
    op.add_column(
        'events',
        sa.Column('moment', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    # server_default='false' evita romper filas existentes al agregar una
    # columna NOT NULL; no hace falta quitarlo después (el ORM siempre manda
    # un valor explícito al crear un Event).
    op.add_column(
        'events',
        sa.Column('available_on_site', sa.Boolean(), nullable=False, server_default='false'),
    )


def downgrade() -> None:
    op.drop_column('events', 'available_on_site')
    op.drop_column('events', 'moment')
    op.drop_column('events', 'time_end')
