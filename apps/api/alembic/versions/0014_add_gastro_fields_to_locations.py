"""add_gastro_fields_to_locations

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-08-17 00:00:00.000000

Etapa 8e-pre — extensión del modelo `Location` para soportar la sección
Gastronomía (mismo patrón que Etapa 7b/lugares de eventos, sin tabla nueva
para el lugar en sí). Agrega:

- Campos gastronómicos a `locations`: `is_gastro`, `plan`, `featured_until`,
  `opening_hours` (JSON por día), contacto (`gastro_whatsapp`,
  `gastro_instagram`, `gastro_web`, `gastro_email`), características
  (`has_delivery`, `has_reservations`, `price_range`) y `cover_img_url`.
  Todos opcionales/con default — retrocompatibles, los `Location` existentes
  quedan con `is_gastro=False` y el resto en null.
- Tabla nueva `location_gastro_types`: tipo gastronómico de un lugar, PK
  compuesta `(location_id, gastro_type)` — igual patrón que
  `event_categories`, permite múltiples tipos por lugar (ej: bar +
  cerveceria). El filtro por tipo es OR en la Etapa 8e.

Solo modelo y migración — sin endpoints ni frontend (eso es Etapa 8e).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('locations', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('is_gastro', sa.Boolean(), nullable=False, server_default=sa.false())
        )
        batch_op.add_column(
            sa.Column('plan', sa.String(), nullable=False, server_default='gratis')
        )
        batch_op.add_column(sa.Column('featured_until', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('opening_hours', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('gastro_whatsapp', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('gastro_instagram', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('gastro_web', sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column('gastro_email', sa.String(length=255), nullable=True))
        batch_op.add_column(
            sa.Column('has_delivery', sa.Boolean(), nullable=False, server_default=sa.false())
        )
        batch_op.add_column(
            sa.Column('has_reservations', sa.Boolean(), nullable=False, server_default=sa.false())
        )
        batch_op.add_column(sa.Column('price_range', sa.String(length=5), nullable=True))
        batch_op.add_column(sa.Column('cover_img_url', sa.String(length=500), nullable=True))

    # server_default solo hacía falta para backfillar filas existentes;
    # el modelo aplica el default en Python de acá en más.
    with op.batch_alter_table('locations', schema=None) as batch_op:
        batch_op.alter_column('is_gastro', server_default=None)
        batch_op.alter_column('plan', server_default=None)
        batch_op.alter_column('has_delivery', server_default=None)
        batch_op.alter_column('has_reservations', server_default=None)

    op.create_table(
        'location_gastro_types',
        sa.Column('location_id', sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column('gastro_type', sa.String(length=50), nullable=False),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id']),
        sa.PrimaryKeyConstraint('location_id', 'gastro_type'),
    )


def downgrade() -> None:
    op.drop_table('location_gastro_types')

    with op.batch_alter_table('locations', schema=None) as batch_op:
        batch_op.drop_column('cover_img_url')
        batch_op.drop_column('price_range')
        batch_op.drop_column('has_reservations')
        batch_op.drop_column('has_delivery')
        batch_op.drop_column('gastro_email')
        batch_op.drop_column('gastro_web')
        batch_op.drop_column('gastro_instagram')
        batch_op.drop_column('gastro_whatsapp')
        batch_op.drop_column('opening_hours')
        batch_op.drop_column('featured_until')
        batch_op.drop_column('plan')
        batch_op.drop_column('is_gastro')
