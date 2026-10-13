"""add payment problem report fields to subscriptions

Revision ID: 7d2f4a9c6e15
Revises: 3c7e9a1f5b28
Create Date: 2026-10-12 12:00:00.000000

Aviso "Tuve un problema con el pago" para una Subscription pending_payment
de MercadoPago (el organizador cerró el checkout o el pago quedó en un
estado raro y necesita ayuda humana). No cambia el estado de la
suscripción — solo deja registro para el panel admin.

- `subscriptions.problem_note` (nota opcional del organizador)
- `subscriptions.problem_reported_at` (cuándo avisó; NULL = nunca avisó)

Sin modelos ORM, igual que el resto de las migraciones.
"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7d2f4a9c6e15"
down_revision: Union[str, None] = "3c7e9a1f5b28"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("subscriptions", schema=None) as batch_op:
        batch_op.add_column(sa.Column("problem_note", sqlmodel.sql.sqltypes.AutoString(), nullable=True))
        batch_op.add_column(sa.Column("problem_reported_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("subscriptions", schema=None) as batch_op:
        batch_op.drop_column("problem_reported_at")
        batch_op.drop_column("problem_note")
