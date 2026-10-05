"""add pg_trgm search indexes

Revision ID: 5e2a7c9d4f13
Revises: 3b8d1e6f9a21
Create Date: 2026-10-05 12:00:00.000000

Búsqueda pública de eventos (`?search=` en GET /api/events,
`list_public_events`): `ilike '%texto%'` sobre `events.title`,
`events.description` y `locations.name` (vía EXISTS). Un btree no sirve
para un `LIKE` con comodín al principio — sin esto cada búsqueda es un seq
scan. Ver PERFORMANCE_AUDIT.md, hallazgo 9.

GIN + `gin_trgm_ops` cubre `ILIKE '%x%'` cuando el patrón tiene al menos 3
caracteres (de ahí el mínimo de 3 que exige `list_public_events`).
`event_categories.category` también entra en el `ilike`, pero son keys
cortas de un catálogo chico — no vale un índice trigram.

Solo Postgres (SQL explícito, sin modelos ORM). `pg_trgm` es una extensión
"trusted" desde PG13: el owner de la DB la puede crear sin superusuario.
El downgrade borra los índices pero deja la extensión instalada (otra cosa
podría estar usándola).
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "5e2a7c9d4f13"
down_revision: Union[str, None] = "3b8d1e6f9a21"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute("CREATE INDEX IF NOT EXISTS ix_events_title_trgm ON events USING gin (title gin_trgm_ops)")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_events_description_trgm ON events USING gin (description gin_trgm_ops)"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_locations_name_trgm ON locations USING gin (name gin_trgm_ops)")


def downgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    op.execute("DROP INDEX IF EXISTS ix_locations_name_trgm")
    op.execute("DROP INDEX IF EXISTS ix_events_description_trgm")
    op.execute("DROP INDEX IF EXISTS ix_events_title_trgm")
