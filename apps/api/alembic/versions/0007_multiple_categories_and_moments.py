"""multiple categories and dual moment (Etapa 6.5)

Revision ID: ef2ce30f8047
Revises: be0b9777e512
Create Date: 2026-08-11 00:00:00.000000

Agrupa los cambios de modelo de las PARTES 1 y 2 de la Etapa 6.5:

1. Crea `event_categories` (many-to-many evento/categoría) y migra los
   datos existentes de `events.category` (1 registro por evento) antes de
   eliminar la columna.
2. Crea `event_moments` (momento diurno/nocturno, puede haber 2 por
   evento) y migra los datos recalculando con
   `app.core.moment.calculate_moments(time, time_end)` — no se copia la
   columna vieja `events.moment` tal cual, porque esa lógica no
   contemplaba momento dual.
3. Elimina las columnas `events.category` y `events.moment` (y el tipo
   enum `eventmoment` en Postgres).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'ef2ce30f8047'
down_revision: Union[str, None] = 'be0b9777e512'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

EVENT_MOMENT_ENUM = sa.Enum('diurno', 'nocturno', name='eventmoment')


def upgrade() -> None:
    op.create_table(
        'event_categories',
        sa.Column('event_id', sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column('category', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.ForeignKeyConstraint(['event_id'], ['events.id']),
        sa.PrimaryKeyConstraint('event_id', 'category'),
    )
    op.create_table(
        'event_moments',
        sa.Column('event_id', sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column('moment', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.ForeignKeyConstraint(['event_id'], ['events.id']),
        sa.PrimaryKeyConstraint('event_id', 'moment'),
    )

    connection = op.get_bind()

    # 1. Migrar categorías existentes (1 por evento -> 1 fila).
    connection.execute(
        sa.text(
            "INSERT INTO event_categories (event_id, category) "
            "SELECT id, category FROM events WHERE category IS NOT NULL"
        )
    )

    # 2. Migrar momentos: se recalculan desde time/time_end con la misma
    #    lógica que app.core.moment.calculate_moments(), no se copia la
    #    columna vieja (que no contemplaba momento dual).
    from app.core.moment import calculate_moments

    rows = connection.execute(sa.text("SELECT id, time, time_end FROM events")).fetchall()
    for event_id, event_time, event_time_end in rows:
        for moment in calculate_moments(event_time, event_time_end):
            connection.execute(
                sa.text("INSERT INTO event_moments (event_id, moment) VALUES (:event_id, :moment)"),
                {"event_id": event_id, "moment": moment},
            )

    op.drop_column('events', 'moment')
    op.drop_column('events', 'category')

    if connection.dialect.name == 'postgresql':
        EVENT_MOMENT_ENUM.drop(connection, checkfirst=True)


def downgrade() -> None:
    connection = op.get_bind()
    if connection.dialect.name == 'postgresql':
        EVENT_MOMENT_ENUM.create(connection, checkfirst=True)
        op.add_column('events', sa.Column('category', sa.VARCHAR(length=50), nullable=True))
        op.add_column('events', sa.Column('moment', EVENT_MOMENT_ENUM, nullable=True))
    else:
        op.add_column('events', sa.Column('category', sa.VARCHAR(length=50), nullable=True))
        op.add_column('events', sa.Column('moment', sa.VARCHAR(length=20), nullable=True))

    op.drop_table('event_moments')
    op.drop_table('event_categories')
