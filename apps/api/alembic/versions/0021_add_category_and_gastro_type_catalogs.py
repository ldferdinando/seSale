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

Idempotente (mismo patrón que 0017_insert_base_data.py): busca por `key`
antes de insertar, con un ORM Session sobre los modelos reales, dentro de la
misma transacción que envuelve la migración.
"""
from typing import Sequence, Union

from sqlmodel import Session, select

import sqlalchemy as sa

from alembic import op
from app.models.event_category_catalog import EventCategoryCatalog
from app.models.gastro_type_catalog import GastroTypeCatalog

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

    bind = op.get_bind()
    with Session(bind=bind) as session:
        for data in CATEGORIES:
            existing = session.exec(
                select(EventCategoryCatalog).where(EventCategoryCatalog.key == data["key"])
            ).first()
            if existing is None:
                session.add(EventCategoryCatalog(**data))
        for data in GASTRO_TYPES:
            existing = session.exec(
                select(GastroTypeCatalog).where(GastroTypeCatalog.key == data["key"])
            ).first()
            if existing is None:
                session.add(GastroTypeCatalog(**data))
        session.commit()


def downgrade() -> None:
    op.drop_table("gastro_types_catalog")
    op.drop_table("event_categories_catalog")
