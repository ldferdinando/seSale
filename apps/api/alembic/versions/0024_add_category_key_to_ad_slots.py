"""add_category_key_to_ad_slots_update_unique_constraint

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-09-11 00:00:00.000000

Etapa 13b — AdSlots para la sección de Categorías. Agrega `category_key`
(nullable) a `ad_slots` para soportar banners generales de `/categorias`
(`category_key=None`) y banners/tiles específicos de `/categorias/{key}`
(`category_key=<key>`), sin crear tablas nuevas.

Reemplaza el UniqueConstraint `uq_ad_slots_city_section_position` por uno de
4 columnas que incluye `category_key`, para que un slot general
(`category_key=None`) y uno específico de categoría puedan coexistir en la
misma (city_id, section, slot_position).

Un UniqueConstraint de 4 columnas por sí solo NO bloquea dos filas con
`category_key=NULL` en la misma (city_id, section, slot_position) — en SQL
estándar NULL nunca es igual a NULL. Se agrega además un índice único
parcial (`WHERE category_key IS NULL`) que sí lo bloquea, soportado tanto en
Postgres como en SQLite (usado en los tests).

Los datos existentes (banners de home y gastronomía) quedan con
`category_key=NULL` — siguen funcionando igual, ninguna fila se toca.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c4d5e6f7a8b9"
down_revision: Union[str, None] = "b3c4d5e6f7a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("ad_slots", schema=None) as batch_op:
        batch_op.add_column(sa.Column("category_key", sa.String(length=50), nullable=True))
        batch_op.drop_constraint("uq_ad_slots_city_section_position", type_="unique")
        batch_op.create_unique_constraint(
            "uq_ad_slot_city_section_position_category",
            ["city_id", "section", "slot_position", "category_key"],
        )

    op.create_index(
        "uq_ad_slot_city_section_position_null_category",
        "ad_slots",
        ["city_id", "section", "slot_position"],
        unique=True,
        postgresql_where=sa.text("category_key IS NULL"),
        sqlite_where=sa.text("category_key IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_ad_slot_city_section_position_null_category", table_name="ad_slots")

    with op.batch_alter_table("ad_slots", schema=None) as batch_op:
        batch_op.drop_constraint("uq_ad_slot_city_section_position_category", type_="unique")
        batch_op.create_unique_constraint(
            "uq_ad_slots_city_section_position", ["city_id", "section", "slot_position"]
        )
        batch_op.drop_column("category_key")
