"""add latitude/longitude to cities

Revision ID: c9d0e1f2a3b4
Revises: b7c8d9e0f1a2
Create Date: 2026-08-13 00:00:00.000000

Etapa 7a — multi-ciudad y geolocalización. `City` no tenía coordenadas
(solo `Location` las tiene desde la Etapa 1); el frontend las necesita para
calcular, vía Haversine, la ciudad activa más cercana al usuario y
sugerirla como ciudad por defecto. Mismo patrón que `Location.latitude`/
`Location.longitude`: nullable, sin default.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c9d0e1f2a3b4'
down_revision: Union[str, None] = 'b7c8d9e0f1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('cities', schema=None) as batch_op:
        batch_op.add_column(sa.Column('latitude', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('longitude', sa.Float(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('cities', schema=None) as batch_op:
        batch_op.drop_column('longitude')
        batch_op.drop_column('latitude')
