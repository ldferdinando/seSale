"""replace_flyer_dual_with_flyer_url

Revision ID: efc52c1e94aa
Revises: f7a8b9c0d1e2
Create Date: 2026-09-18 10:00:00.000000

Etapa "Diseño v3" — deprecа el flyer dual desktop/mobile (Etapa 12b) y
vuelve a un único flyer por evento, proporción 4:5 (1080×1350, "como el
feed de Instagram"), para poder implementar la card de Destacado Plus
rediseñada (imagen completa de fondo + panel translúcido).

1. Agrega `events.flyer_url` (nullable, sin validación de dimensiones en
   el modelo — mismo criterio que el campo que reemplaza).
2. Elimina `events.flyer_url_desktop` y `events.flyer_url_mobile`
   directamente (no se dejan como columnas huérfanas): decisión de la
   usuaria de no reusar ninguno de los dos flyers viejos — no hay
   necesidad de rollback histórico sobre esos datos, así que un DROP
   directo es más simple que una migración en dos pasos.
3. NO copia ningún valor de flyer_url_desktop/flyer_url_mobile a
   flyer_url — todos los eventos existentes quedan con flyer_url=NULL
   (decisión explícita de la usuaria: el organizador resube en el
   formato correcto, no se intenta reusar/recortar ninguna imagen vieja).
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "efc52c1e94aa"
down_revision: Union[str, None] = "f7a8b9c0d1e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("events", schema=None) as batch_op:
        batch_op.add_column(sa.Column("flyer_url", sa.String(), nullable=True))
        batch_op.drop_column("flyer_url_mobile")
        batch_op.drop_column("flyer_url_desktop")


def downgrade() -> None:
    with op.batch_alter_table("events", schema=None) as batch_op:
        batch_op.add_column(sa.Column("flyer_url_desktop", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("flyer_url_mobile", sa.String(), nullable=True))
        batch_op.drop_column("flyer_url")
