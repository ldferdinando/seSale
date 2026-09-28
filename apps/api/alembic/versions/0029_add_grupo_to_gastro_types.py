"""add_grupo_to_gastro_types

Revision ID: da5f20b4cbd9
Revises: efc52c1e94aa
Create Date: 2026-09-27 10:00:00.000000

Etapa "Gastronomía y otros" — grupo Espacios: agrega `grupo` a
`gastro_types_catalog` ("gastro" | "espacios", default "gastro" así los 10
tipos existentes no cambian de grupo) y carga los 3 tipos nuevos del grupo
"espacios" (club, centro cultural, salón de eventos) — ver TIPO_GRUPO en
seSALE.html y ARCHITECTURE.md/a_revisar.md.

Idempotente: busca por `key` antes de insertar.

No usa el modelo ORM `GastroTypeCatalog` (aunque hoy, al ser la migración
HEAD, sus columnas coincidirían 1:1) — usa una tabla liviana
(`sa.table`/`sa.column`) igual que el resto de las migraciones de datos
(ver 0017/0021 y a_revisar.md): así esta migración sigue siendo válida sin
tocarla el día que `GastroTypeCatalog` gane una columna nueva más adelante.
"""
from datetime import datetime, timezone
from typing import Sequence, Union
from uuid import uuid4

import sqlalchemy as sa

from alembic import op

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

# Tabla liviana — solo las columnas que esta migración necesita tocar
# (`key` para el chequeo de idempotencia, el resto para el INSERT).
gastro_types_catalog = sa.table(
    "gastro_types_catalog",
    sa.column("id", sa.Uuid()),
    sa.column("key", sa.String(length=50)),
    sa.column("name", sa.String(length=100)),
    sa.column("emoji", sa.String(length=10)),
    sa.column("sort_order", sa.Integer()),
    sa.column("grupo", sa.String(length=20)),
    sa.column("is_active", sa.Boolean()),
    sa.column("created_at", sa.DateTime()),
)


def upgrade() -> None:
    op.add_column(
        "gastro_types_catalog",
        sa.Column("grupo", sa.String(length=20), nullable=False, server_default="gastro"),
    )

    conn = op.get_bind()
    now = datetime.now(timezone.utc)
    for data in ESPACIOS_TYPES:
        existing = conn.execute(
            sa.select(gastro_types_catalog.c.id).where(gastro_types_catalog.c.key == data["key"])
        ).first()
        if existing is None:
            conn.execute(
                sa.insert(gastro_types_catalog).values(id=uuid4(), is_active=True, created_at=now, **data)
            )


def downgrade() -> None:
    conn = op.get_bind()
    for data in ESPACIOS_TYPES:
        conn.execute(sa.delete(gastro_types_catalog).where(gastro_types_catalog.c.key == data["key"]))

    op.drop_column("gastro_types_catalog", "grupo")
