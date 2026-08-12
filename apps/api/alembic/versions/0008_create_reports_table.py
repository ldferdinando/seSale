"""create reports table (Etapa 6.5)

Revision ID: f010a4bdfcc5
Revises: ef2ce30f8047
Create Date: 2026-08-11 00:00:00.000000

Migración individual (separada de la 0007) para la tabla `reports`:
reportes de eventos hechos por usuarios sin login.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'f010a4bdfcc5'
down_revision: Union[str, None] = 'ef2ce30f8047'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'reports',
        sa.Column('id', sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column('event_id', sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column('text', sqlmodel.sql.sqltypes.AutoString(length=1000), nullable=False),
        sa.Column('contact_phone', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column('ip_address', sqlmodel.sql.sqltypes.AutoString(length=45), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('phone_verified', sa.Boolean(), nullable=False),
        sa.Column('status', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.ForeignKeyConstraint(['event_id'], ['events.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_reports_event_id'), 'reports', ['event_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_reports_event_id'), table_name='reports')
    op.drop_table('reports')
