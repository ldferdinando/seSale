"""pricing system: plans, plan_prices, new subscriptions

Revision ID: 8f3c1a9d2b4e
Revises: 12faecf09ca6
Create Date: 2026-07-31 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '8f3c1a9d2b4e'
down_revision: Union[str, None] = '12faecf09ca6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'plans',
        sa.Column('id', sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column('plan_type', sa.Enum('gratis', 'dest', 'pro', 'banner', name='plantype'), nullable=False),
        sa.Column('pricing_type', sa.Enum('fixed', 'custom', name='pricingtype'), nullable=False),
        sa.Column('description', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'plan_prices',
        sa.Column('id', sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column('plan_id', sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('currency', sqlmodel.sql.sqltypes.AutoString(length=10), nullable=False),
        sa.Column('valid_from', sa.Date(), nullable=False),
        sa.Column('valid_until', sa.Date(), nullable=True),
        sa.Column('promo_label', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_by', sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column('notes', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['plan_id'], ['plans.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )

    op.drop_table('subscriptions')

    op.create_table(
        'subscriptions',
        sa.Column('id', sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column('user_id', sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column('plan_id', sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column('plan_price_id', sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column(
            'status',
            sa.Enum('active', 'expired', 'cancelled', 'pending_payment', name='subscriptionstatus'),
            nullable=False,
        ),
        sa.Column('starts_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('mp_payment_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('mp_subscription_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('amount_paid', sa.Integer(), nullable=False),
        sa.Column('currency', sqlmodel.sql.sqltypes.AutoString(length=10), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('approved_by', sqlmodel.sql.sqltypes.GUID(), nullable=True),
        sa.Column('notes', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['plan_id'], ['plans.id'], ),
        sa.ForeignKeyConstraint(['plan_price_id'], ['plan_prices.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )

    # events.plan: gratis/dest/pro (eventplan) -> gratis/dest/pro/banner (plantype)
    # Los valores existentes son un subconjunto válido del nuevo enum, así que
    # los eventos ya cargados conservan su plan actual; el default sigue en "gratis".
    # batch_alter_table es un workaround de SQLite; en Postgres el ALTER TYPE de un
    # enum necesita un USING explícito, así que se hace por dialecto.
    if op.get_bind().dialect.name == 'postgresql':
        op.execute("ALTER TABLE events ALTER COLUMN plan DROP DEFAULT")
        op.execute("ALTER TABLE events ALTER COLUMN plan TYPE plantype USING plan::text::plantype")
        op.execute("ALTER TABLE events ALTER COLUMN plan SET DEFAULT 'gratis'")
    else:
        with op.batch_alter_table('events', schema=None) as batch_op:
            batch_op.alter_column(
                'plan',
                existing_type=sa.Enum('gratis', 'dest', 'pro', name='eventplan'),
                type_=sa.Enum('gratis', 'dest', 'pro', 'banner', name='plantype'),
                existing_nullable=False,
                existing_server_default=sa.text("'gratis'"),
            )


def downgrade() -> None:
    if op.get_bind().dialect.name == 'postgresql':
        op.execute("ALTER TABLE events ALTER COLUMN plan DROP DEFAULT")
        op.execute("ALTER TABLE events ALTER COLUMN plan TYPE eventplan USING plan::text::eventplan")
        op.execute("ALTER TABLE events ALTER COLUMN plan SET DEFAULT 'gratis'")
    else:
        with op.batch_alter_table('events', schema=None) as batch_op:
            batch_op.alter_column(
                'plan',
                existing_type=sa.Enum('gratis', 'dest', 'pro', 'banner', name='plantype'),
                type_=sa.Enum('gratis', 'dest', 'pro', name='eventplan'),
                existing_nullable=False,
            )

    op.drop_table('subscriptions')

    op.create_table(
        'subscriptions',
        sa.Column('id', sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column('user_id', sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column('plan', sa.Enum('gratis', 'dest', 'pro', name='eventplan'), nullable=False),
        sa.Column('status', sa.Enum('active', 'expired', 'cancelled', name='subscriptionstatus'), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('mp_payment_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('mp_subscription_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )

    op.drop_table('plan_prices')
    op.drop_table('plans')
