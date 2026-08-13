"""add transfer payment fields to subscriptions

Revision ID: a1b2c3d4e5f6
Revises: f010a4bdfcc5
Create Date: 2026-08-12 00:00:00.000000

Etapa 6b-1 — pago manual con aviso de transferencia (sin comprobante
adjunto todavía, ver a_revisar.md). Agrega:

- el valor `pending_approval` al enum `subscriptionstatus` (aviso de
  transferencia esperando revisión del admin)
- `payment_method` ("mercadopago" | "transfer" | "manual"), con backfill:
  las Subscription de un plan `pricing_type=custom` (Banner) ya activadas
  a mano vía `PATCH /admin/subscriptions/{id}/activate` se marcan
  `payment_method='manual'` retroactivamente, para que el badge del panel
  admin sea correcto desde el día 1
- `transfer_note` (nota del usuario al avisar la transferencia)
- `reviewed_at` (cuándo `approved_by` aprobó o rechazó)

`approved_by` y `notes` ya existían desde la 0002 — se reusan como
reviewer y admin_notes, no se duplican.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f010a4bdfcc5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

OLD_STATUS_ENUM = sa.Enum('active', 'expired', 'cancelled', 'pending_payment', name='subscriptionstatus')
NEW_STATUS_ENUM = sa.Enum(
    'active', 'expired', 'cancelled', 'pending_payment', 'pending_approval', name='subscriptionstatus'
)


def upgrade() -> None:
    bind = op.get_bind()

    if bind.dialect.name == 'postgresql':
        op.execute("ALTER TYPE subscriptionstatus ADD VALUE IF NOT EXISTS 'pending_approval'")
    else:
        with op.batch_alter_table('subscriptions', schema=None) as batch_op:
            batch_op.alter_column(
                'status',
                existing_type=OLD_STATUS_ENUM,
                type_=NEW_STATUS_ENUM,
                existing_nullable=False,
            )

    with op.batch_alter_table('subscriptions', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                'payment_method',
                sqlmodel.sql.sqltypes.AutoString(),
                nullable=False,
                server_default='mercadopago',
            )
        )
        batch_op.add_column(sa.Column('transfer_note', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
        batch_op.add_column(sa.Column('reviewed_at', sa.DateTime(), nullable=True))

    # Backfill: suscripciones de plan Banner (pricing_type=custom) ya
    # activadas a mano quedan marcadas payment_method='manual'.
    op.execute(
        "UPDATE subscriptions SET payment_method = 'manual' "
        "WHERE plan_id IN (SELECT id FROM plans WHERE pricing_type = 'custom')"
    )


def downgrade() -> None:
    bind = op.get_bind()

    with op.batch_alter_table('subscriptions', schema=None) as batch_op:
        batch_op.drop_column('reviewed_at')
        batch_op.drop_column('transfer_note')
        batch_op.drop_column('payment_method')

    if bind.dialect.name == 'postgresql':
        # Postgres no permite quitar un valor de un enum sin recrearlo; las
        # filas con status='pending_approval' quedarían inválidas si existen.
        # No se soporta downgrade automático si hay filas en ese estado.
        op.execute(
            "DELETE FROM subscriptions WHERE status = 'pending_approval'"
        )
        op.execute("ALTER TYPE subscriptionstatus RENAME TO subscriptionstatus_old")
        OLD_STATUS_ENUM.create(bind, checkfirst=True)
        op.execute(
            "ALTER TABLE subscriptions ALTER COLUMN status TYPE subscriptionstatus "
            "USING status::text::subscriptionstatus"
        )
        op.execute("DROP TYPE subscriptionstatus_old")
    else:
        op.execute("DELETE FROM subscriptions WHERE status = 'pending_approval'")
        with op.batch_alter_table('subscriptions', schema=None) as batch_op:
            batch_op.alter_column(
                'status',
                existing_type=NEW_STATUS_ENUM,
                type_=OLD_STATUS_ENUM,
                existing_nullable=False,
            )
