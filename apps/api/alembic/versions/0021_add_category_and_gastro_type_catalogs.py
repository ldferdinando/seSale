"""add_category_and_gastro_type_catalogs

Revision ID: f5a6b7c8d9e0
Revises: e4f5a6b7c8d9
Create Date: 2026-08-25 10:00:00.000000

Etapa 12a — tablas `event_categories_catalog` y `gastro_types_catalog`:
catálogo editable por el admin (nombre, emoji, color, orden,
activo/inactivo) sobre los mismos `key` que ya se guardaban como string
suelto en `event_categories.category` / `location_gastro_types.gastro_type`
(esas dos tablas intermedias NO cambian, siguen usando strings — son
retrocompatibles con esta migración sin tocarlas).

Se pueblan con los mismos 13 keys / 10 keys que hasta ahora vivían
hardcodeados como `VALID_CATEGORIES` (app/schemas/event.py) y `GASTRO_TYPES`
(app/models/location_gastro_type.py) — ningún evento/lugar existente pierde
su categoría/tipo, y de acá en más el admin puede agregar/editar/desactivar
sin cambio de código (ver ARCHITECTURE.md, a_revisar.md).

Idempotente: busca por `key` antes de insertar.

Fix (2026-09-27): usaba los modelos ORM ACTUALES (`EventCategoryCatalog`,
`GastroTypeCatalog`) para el SELECT/INSERT — `GastroTypeCatalog` ganó la
columna `grupo` en la migración 0029 (posterior a esta), así que
`select(GastroTypeCatalog)` generaba SQL con una columna que todavía no
existe en este punto de la historia: rompía con `UndefinedColumn:
gastro_types_catalog.grupo does not exist` en una base nueva corriendo
`alembic upgrade head` desde cero. Reescrita para usar tablas livianas
(`sa.table`/`sa.column`, con exactamente las columnas que esta misma
migración crea un poco más arriba, ni una más) en vez de los modelos
reales — ver 0017_insert_base_data.py y a_revisar.md para el mismo fix y
el detalle completo.
"""
from datetime import datetime, timezone
from typing import Sequence, Union
from uuid import uuid4

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f5a6b7c8d9e0"
down_revision: Union[str, None] = "e4f5a6b7c8d9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CATEGORIES = [
    {"key": "musica", "name": "Música en vivo", "emoji": "🎵", "sort_order": 1},
    {"key": "fiesta", "name": "Fiesta / Baile", "emoji": "🎉", "sort_order": 2},
    {"key": "teatro", "name": "Teatro", "emoji": "🎭", "sort_order": 3},
    {"key": "feria", "name": "Feria", "emoji": "🛍️", "sort_order": 4},
    {"key": "dj", "name": "DJ / Electrónica", "emoji": "🎧", "sort_order": 5},
    {"key": "milonga", "name": "Milonga / Tango", "emoji": "💃", "sort_order": 6},
    {"key": "pena", "name": "Peña folclórica", "emoji": "🪗", "sort_order": 7},
    {"key": "standup", "name": "Stand up", "emoji": "🎤", "sort_order": 8},
    {"key": "arte", "name": "Exposición / Arte", "emoji": "🎨", "sort_order": 9},
    {"key": "recital", "name": "Recital", "emoji": "🎸", "sort_order": 10},
    {"key": "cine", "name": "Cine", "emoji": "🎬", "sort_order": 11},
    {"key": "infantil", "name": "Infantil", "emoji": "🧸", "sort_order": 12},
    {"key": "deportes", "name": "Deportes", "emoji": "⚽", "sort_order": 13},
]

GASTRO_TYPES = [
    {"key": "cerveceria", "name": "Cervecería", "emoji": "🍺", "sort_order": 1},
    {"key": "restaurante", "name": "Restaurante", "emoji": "🍽️", "sort_order": 2},
    {"key": "parrilla", "name": "Parrilla", "emoji": "🥩", "sort_order": 3},
    {"key": "bar", "name": "Bar", "emoji": "🍸", "sort_order": 4},
    {"key": "cafe", "name": "Café", "emoji": "☕", "sort_order": 5},
    {"key": "pizzeria", "name": "Pizzería", "emoji": "🍕", "sort_order": 6},
    {"key": "heladeria", "name": "Heladería", "emoji": "🍦", "sort_order": 7},
    {"key": "rotiseria", "name": "Rotisería", "emoji": "🥡", "sort_order": 8},
    {"key": "vinoteca", "name": "Vinoteca", "emoji": "🍷", "sort_order": 9},
    {"key": "otro", "name": "Otro", "emoji": "🏪", "sort_order": 10},
]


def upgrade() -> None:
    op.create_table(
        "event_categories_catalog",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("key", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("emoji", sa.String(length=10), nullable=True),
        sa.Column("color", sa.String(length=20), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key"),
    )

    op.create_table(
        "gastro_types_catalog",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("key", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("emoji", sa.String(length=10), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key"),
    )

    # Tablas livianas — exactamente las columnas creadas arriba, no las del
    # modelo ORM actual (que en el caso de gastro_types_catalog ya tiene
    # `grupo`, agregado recién en 0029).
    event_categories_catalog = sa.table(
        "event_categories_catalog",
        sa.column("id", sa.Uuid()),
        sa.column("key", sa.String(length=50)),
        sa.column("name", sa.String(length=100)),
        sa.column("emoji", sa.String(length=10)),
        sa.column("color", sa.String(length=20)),
        sa.column("sort_order", sa.Integer()),
        sa.column("is_active", sa.Boolean()),
        sa.column("created_at", sa.DateTime()),
    )
    gastro_types_catalog = sa.table(
        "gastro_types_catalog",
        sa.column("id", sa.Uuid()),
        sa.column("key", sa.String(length=50)),
        sa.column("name", sa.String(length=100)),
        sa.column("emoji", sa.String(length=10)),
        sa.column("sort_order", sa.Integer()),
        sa.column("is_active", sa.Boolean()),
        sa.column("created_at", sa.DateTime()),
    )

    conn = op.get_bind()
    now = datetime.now(timezone.utc)
    for data in CATEGORIES:
        existing = conn.execute(
            sa.select(event_categories_catalog.c.id).where(event_categories_catalog.c.key == data["key"])
        ).first()
        if existing is None:
            conn.execute(
                sa.insert(event_categories_catalog).values(
                    id=uuid4(),
                    color=None,
                    is_active=True,
                    created_at=now,
                    **data,
                )
            )
    for data in GASTRO_TYPES:
        existing = conn.execute(
            sa.select(gastro_types_catalog.c.id).where(gastro_types_catalog.c.key == data["key"])
        ).first()
        if existing is None:
            conn.execute(
                sa.insert(gastro_types_catalog).values(
                    id=uuid4(),
                    is_active=True,
                    created_at=now,
                    **data,
                )
            )


def downgrade() -> None:
    op.drop_table("gastro_types_catalog")
    op.drop_table("event_categories_catalog")
