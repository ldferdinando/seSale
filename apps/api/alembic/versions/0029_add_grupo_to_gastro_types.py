"""add_grupo_to_gastro_types

Revision ID: da5f20b4cbd9
Revises: efc52c1e94aa
Create Date: 2026-09-27 10:00:00.000000

Etapa "Gastronomía y otros" — grupo Espacios: agrega `grupo` a
`gastro_types_catalog` ("gastro" | "espacios", default "gastro" así los 10
tipos existentes no cambian de grupo) y carga los 3 tipos nuevos del grupo
"espacios" (club, centro cultural, salón de eventos) — ver TIPO_GRUPO en
seSALE.html y ARCHITECTURE.md/a_revisar.md.

Idempotente, mismo patrón que 0021_add_category_and_gastro_type_catalogs.py:
busca por `key` antes de insertar.
"""
from typing import Sequence, Union

from sqlmodel import Session, select

import sqlalchemy as sa

from alembic import op
from app.models.gastro_type_catalog import GastroTypeCatalog

# revision identifiers, used by Alembic.
revision: str = "da5f20b4cbd9"
down_revision: Union[str, None] = "efc52c1e94aa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ESPACIOS_TYPES = [
    {"key": "club", "name": "Club", "emoji": "🎶", "sort_order": 11, "grupo": "espacios"},
    {"key": "centro", "name": "Centro cultural", "emoji": "🏛️", "sort_order": 12, "grupo": "espacios"},
    {"key": "salon", "name": "Salón de eventos", "emoji": "🎪", "sort_order": 13, "grupo": "espacios"},
]


def upgrade() -> None:
    op.add_column(
        "gastro_types_catalog",
        sa.Column("grupo", sa.String(length=20), nullable=False, server_default="gastro"),
    )

    bind = op.get_bind()
    with Session(bind=bind) as session:
        for data in ESPACIOS_TYPES:
            existing = session.exec(
                select(GastroTypeCatalog).where(GastroTypeCatalog.key == data["key"])
            ).first()
            if existing is None:
                session.add(GastroTypeCatalog(**data))
        session.commit()


def downgrade() -> None:
    bind = op.get_bind()
    with Session(bind=bind) as session:
        for data in ESPACIOS_TYPES:
            existing = session.exec(
                select(GastroTypeCatalog).where(GastroTypeCatalog.key == data["key"])
            ).first()
            if existing is not None:
                session.delete(existing)
        session.commit()

    op.drop_column("gastro_types_catalog", "grupo")
