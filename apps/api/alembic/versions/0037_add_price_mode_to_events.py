"""events: add price_mode (fixed / consultar / ver_descripcion)

Revision ID: 2e5f8a1c4b7d
Revises: 9b4e1c7a2d63
Create Date: 2026-10-13 15:00:00.000000

Agrega `events.price_mode`, un selector de cómo se muestra el precio de un
evento pago ("pago", no "anticipo") cuando hay varios valores posibles
(preventa/puerta vía texto libre en la descripción, o directamente "a
consultar") en vez de forzar un único monto numérico:

- "fixed" (default): comportamiento actual, `price_at_door` numérico.
- "consultar": no se carga monto, se muestra "Consultar precio".
- "ver_descripcion": no se carga monto, se muestra "Ver precios en la
  descripción".

VARCHAR simple (no Enum nativo de Postgres), siguiendo el mismo criterio
que `subscriptions.payment_method` (migración 0009): la validación de los
tres valores posibles vive en Pydantic (schemas/event.py), no en la DB.
Backfill: todas las filas existentes tienen `price_at_door` numérico o
ninguno cargado, así que `price_mode='fixed'` para todas es correcto sin
tocar datos.

Sin modelos ORM, igual que el resto de las migraciones.
"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2e5f8a1c4b7d"
down_revision: Union[str, None] = "9b4e1c7a2d63"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("events", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "price_mode",
                sqlmodel.sql.sqltypes.AutoString(),
                nullable=False,
                server_default="fixed",
            )
        )
    with op.batch_alter_table("events", schema=None) as batch_op:
        batch_op.alter_column("price_mode", server_default=None)


def downgrade() -> None:
    with op.batch_alter_table("events", schema=None) as batch_op:
        batch_op.drop_column("price_mode")
