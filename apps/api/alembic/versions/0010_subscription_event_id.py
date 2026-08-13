"""add event_id to subscriptions (pago por evento, no por cuenta)

Revision ID: b7c8d9e0f1a2
Revises: a1b2c3d4e5f6
Create Date: 2026-08-13 00:00:00.000000

Etapa 6b-2 — corrección de arquitectura: un plan dest/pro se compra para UN
evento puntual (elegido por el organizador al momento de pagar), no para
"todos los eventos aprobados del organizador" como hacía el código hasta
ahora (`_apply_plan_to_organizer_events`). Se agrega `event_id` (FK a
`events`, nullable) a `subscriptions`.

Nullable porque:
- El plan Banner (pricing_type=custom) no es un upgrade de un evento, es un
  espacio publicitario del sitio — sus Subscription no llevan event_id.
- Las Subscription ya existentes (creadas antes de esta migración) no tienen
  forma de inferir retroactivamente a qué evento correspondían — quedan con
  event_id=NULL. Ver a_revisar.md.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c8d9e0f1a2'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('subscriptions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('event_id', sa.Uuid(), nullable=True))
        batch_op.create_foreign_key(
            'fk_subscriptions_event_id_events', 'events', ['event_id'], ['id']
        )


def downgrade() -> None:
    with op.batch_alter_table('subscriptions', schema=None) as batch_op:
        batch_op.drop_constraint('fk_subscriptions_event_id_events', type_='foreignkey')
        batch_op.drop_column('event_id')
