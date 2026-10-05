"""add search branch indexes (event categories trgm + events.location_id)

Revision ID: 8a4f2b6c1d37
Revises: 5e2a7c9d4f13
Create Date: 2026-10-05 18:00:00.000000

Complementa 0032. La búsqueda pública (`list_public_events`, `?search=`) se
resuelve como `events.id IN (UNION de 4 ramas)` y cada rama necesita su
índice para no hacer seq scan:

- título / descripción → trigram de 0032.
- categoría → `event_categories.category ILIKE '%x%'`. En 0032 se había
  descartado el índice por ser un catálogo chico, pero la tabla tiene una
  fila por evento×categoría: en la prueba de carga (50 000 eventos) esta
  rama era 15.8 de los 16.5 ms de la query. GIN trigram.
- lugar → `events.location_id IN (locations que matchean)`: sin índice en
  `events.location_id` es un seq scan de `events` cada vez que algún lugar
  matchea. Btree; también lo usa el filtro `?location_id=` ("Eventos en este
  lugar") — PERFORMANCE_AUDIT.md, hallazgo 9.

Solo Postgres, SQL explícito (sin modelos ORM), igual que 0032.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "8a4f2b6c1d37"
down_revision: Union[str, None] = "5e2a7c9d4f13"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_event_categories_category_trgm "
        "ON event_categories USING gin (category gin_trgm_ops)"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_events_location_id ON events (location_id)")


def downgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    op.execute("DROP INDEX IF EXISTS ix_events_location_id")
    op.execute("DROP INDEX IF EXISTS ix_event_categories_category_trgm")
