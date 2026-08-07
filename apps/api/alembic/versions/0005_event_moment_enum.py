"""fix events.moment drift: VARCHAR -> Enum(eventmoment)

Revision ID: 7c4a1e9f2b6d
Revises: 6a1c8e2f4d7b
Create Date: 2026-08-06 00:00:00.000000

La migración 0004 agregó `events.moment` como VARCHAR (AutoString) pero el
modelo (`app/models/event.py`) siempre la definió como
`Enum('diurno', 'nocturno', name='eventmoment')`. En Postgres esto significa
que la columna real quedó como VARCHAR sin el tipo enum nativo que el ORM
espera; en SQLite no hay tipo enum nativo (SQLAlchemy lo emula con un CHECK
constraint), así que ahí el drift es solo de intención, no de esquema.

Esta migración corrige el tipo de columna en ambos motores. En Postgres hay
que crear el tipo `eventmoment` y hacer un ALTER ... USING explícito (Alembic
no sabe generar ese cast solo); en SQLite se usa batch mode (alter_column de
un VARCHAR a Enum no es soportado fuera de batch mode, ver 6ae83d5).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7c4a1e9f2b6d'
down_revision: Union[str, None] = '6a1c8e2f4d7b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

EVENT_MOMENT_ENUM = sa.Enum('diurno', 'nocturno', name='eventmoment')


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        EVENT_MOMENT_ENUM.create(bind, checkfirst=True)
        op.execute(
            "ALTER TABLE events ALTER COLUMN moment TYPE eventmoment "
            "USING moment::eventmoment"
        )
    else:
        with op.batch_alter_table('events') as batch_op:
            batch_op.alter_column(
                'moment',
                existing_type=sa.String(),
                type_=EVENT_MOMENT_ENUM,
                existing_nullable=True,
            )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute("ALTER TABLE events ALTER COLUMN moment TYPE VARCHAR USING moment::text")
        EVENT_MOMENT_ENUM.drop(bind, checkfirst=True)
    else:
        with op.batch_alter_table('events') as batch_op:
            batch_op.alter_column(
                'moment',
                existing_type=EVENT_MOMENT_ENUM,
                type_=sa.String(),
                existing_nullable=True,
            )
