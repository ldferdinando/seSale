"""add site_settings

Revision ID: 3b8d1e6f9a21
Revises: 7c3e9f1a2b40
Create Date: 2026-10-04 12:00:00.000000

Configuración general del sitio editable desde el admin (una sola fila,
id=1). Arranca con `payment_alias` — el alias de pago por transferencia que
se muestra en /planes/transferencia (reemplaza a NEXT_PUBLIC_BANK_INFO). Ver
a_revisar.md, "Fix: flujo de pago por transferencia".

Inserta la fila única vacía (payment_alias=NULL) si no existe: idempotente.
Igual que el resto de las migraciones de datos (0017/0021/0029) no usa el
modelo ORM `SiteSettings`, sino una tabla liviana (`sa.table`/`sa.column`).
"""
from datetime import datetime, timezone
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "3b8d1e6f9a21"
down_revision: Union[str, None] = "7c3e9f1a2b40"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SITE_SETTINGS_ID = 1

site_settings = sa.table(
    "site_settings",
    sa.column("id", sa.Integer()),
    sa.column("payment_alias", sa.String(length=100)),
    sa.column("updated_at", sa.DateTime()),
)


def upgrade() -> None:
    op.create_table(
        "site_settings",
        sa.Column("id", sa.Integer(), autoincrement=False, nullable=False),
        sa.Column("payment_alias", sa.String(length=100), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    conn = op.get_bind()
    existing = conn.execute(sa.select(site_settings.c.id).where(site_settings.c.id == SITE_SETTINGS_ID)).first()
    if existing is None:
        conn.execute(
            sa.insert(site_settings).values(
                id=SITE_SETTINGS_ID, payment_alias=None, updated_at=datetime.now(timezone.utc)
            )
        )


def downgrade() -> None:
    op.drop_table("site_settings")
