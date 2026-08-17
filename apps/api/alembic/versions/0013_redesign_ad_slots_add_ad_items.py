"""redesign_ad_slots_add_ad_items

Revision ID: e5f6a7b8c9d0
Revises: d1e2f3a4b5c6
Create Date: 2026-08-17 00:00:00.000000

Etapa 8d-pre — rediseño del modelo de banners para soportar el sistema
completo definido en `seSALE.html` (dos secciones, Eventos y Gastronomía,
cada una con 3 carruseles wide + grilla de tiles para Eventos), antes de
construir la feature completa (Etapa 8d). Modelo de una sola tabla
`ad_slots` (mezclaba "espacio" y "contenido") pasa a dos tablas:

- `ad_slots`: el ESPACIO publicitario — posición fija en la página, la crea
  el sistema (seed), no el admin. Pierde `slot_key`/`advertiser_name`/
  `img_url`/`link_url`/`alt_text`/`sort_order` (eran del contenido, no del
  espacio); gana `section`, `slot_position`, `rotation_mode`,
  `rotation_interval_seconds`, `created_at`, y un UniqueConstraint
  `(city_id, section, slot_position)`.
- `ad_items` (nueva): la PIEZA publicitaria — imagen + link + vigencia,
  cargada por el admin para un usuario registrado (`user_id`, el
  anunciante) y auditada con `created_by` (el admin que la cargó).

Datos existentes: la tabla `ad_slots` ya existía en la DB (creada en
`0001_initial.py`) con 3 filas de seed vacías (`slot_key="home-0/1/2"`,
`city_id`=General Roca, sin `img_url`/`advertiser_name`/etc., todas
`is_active=False`) — sin contenido real, pero el formato `home-N` mapea
1:1 y sin ambigüedad a `section="eventos", slot_position=N`. Se migran
in-place con ese mapeo (no se descartan) antes de dropear las columnas
viejas.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'd1e2f3a4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) Columnas nuevas en ad_slots, nullable por ahora para poder
    #    backfillarlas desde slot_key antes de forzar NOT NULL.
    with op.batch_alter_table('ad_slots', schema=None) as batch_op:
        batch_op.add_column(sa.Column('section', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('slot_position', sa.Integer(), nullable=True))
        batch_op.add_column(
            sa.Column('rotation_mode', sa.String(length=20), nullable=False, server_default='sequential')
        )
        batch_op.add_column(
            sa.Column('rotation_interval_seconds', sa.Integer(), nullable=False, server_default='3')
        )
        batch_op.add_column(
            sa.Column(
                'created_at',
                sa.DateTime(),
                nullable=False,
                server_default=sa.func.now(),
            )
        )

    # 2) Backfill: slot_key "home-N" -> section="eventos", slot_position=N.
    #    Es el único formato presente en la DB real (ver docstring); un
    #    slot_key con otro formato queda con section/slot_position NULL y
    #    se elimina más abajo (dato de seed, no de producción).
    conn = op.get_bind()
    existing_rows = conn.execute(sa.text('SELECT id, slot_key FROM ad_slots')).fetchall()
    unmapped_ids = []
    for row in existing_rows:
        slot_key = row.slot_key or ''
        if slot_key.startswith('home-') and slot_key[len('home-'):].isdigit():
            position = int(slot_key[len('home-'):])
            conn.execute(
                sa.text(
                    'UPDATE ad_slots SET section = :section, slot_position = :position WHERE id = :id'
                ),
                {'section': 'eventos', 'position': position, 'id': row.id},
            )
        else:
            unmapped_ids.append(row.id)

    # Filas que no se pudieron mapear de forma confiable: son datos de seed,
    # no de producción real — se eliminan (loguear vía print, alembic no
    # tiene logger propio configurado por default en este proyecto).
    if unmapped_ids:
        print(f"[0013] Eliminando {len(unmapped_ids)} ad_slots sin slot_key mapeable: {unmapped_ids}")
        for row_id in unmapped_ids:
            conn.execute(sa.text('DELETE FROM ad_slots WHERE id = :id'), {'id': row_id})

    # 3) Ahora que todas las filas restantes tienen section/slot_position,
    #    forzar NOT NULL y dropear las columnas viejas del "contenido".
    with op.batch_alter_table('ad_slots', schema=None) as batch_op:
        batch_op.alter_column('section', existing_type=sa.String(length=20), nullable=False)
        batch_op.alter_column('slot_position', existing_type=sa.Integer(), nullable=False, server_default='0')
        batch_op.alter_column('rotation_mode', server_default=None)
        batch_op.alter_column('rotation_interval_seconds', server_default=None)
        batch_op.alter_column('created_at', server_default=None)
        batch_op.drop_column('slot_key')
        batch_op.drop_column('advertiser_name')
        batch_op.drop_column('img_url')
        batch_op.drop_column('link_url')
        batch_op.drop_column('alt_text')
        batch_op.drop_column('sort_order')
        batch_op.create_unique_constraint(
            'uq_ad_slots_city_section_position', ['city_id', 'section', 'slot_position']
        )
        batch_op.create_index(batch_op.f('ix_ad_slots_city_id'), ['city_id'], unique=False)

    # 4) Tabla nueva ad_items.
    op.create_table(
        'ad_items',
        sa.Column('id', sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column('slot_id', sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column('user_id', sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column('img_url', sa.String(length=500), nullable=False),
        sa.Column('link_url', sa.String(length=500), nullable=True),
        sa.Column('alt_text', sa.String(length=255), nullable=True),
        sa.Column('advertiser_name', sa.String(length=255), nullable=True),
        sa.Column('starts_at', sa.Date(), nullable=False),
        sa.Column('ends_at', sa.Date(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False),
        sa.Column('created_by', sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.ForeignKeyConstraint(['slot_id'], ['ad_slots.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('ad_items', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_ad_items_slot_id'), ['slot_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_ad_items_user_id'), ['user_id'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('ad_items', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_ad_items_user_id'))
        batch_op.drop_index(batch_op.f('ix_ad_items_slot_id'))
    op.drop_table('ad_items')

    with op.batch_alter_table('ad_slots', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_ad_slots_city_id'))
        batch_op.drop_constraint('uq_ad_slots_city_section_position', type_='unique')
        batch_op.add_column(sa.Column('slot_key', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('advertiser_name', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('img_url', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('link_url', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('alt_text', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'))

    conn = op.get_bind()
    conn.execute(
        sa.text(
            "UPDATE ad_slots SET slot_key = section || '-' || slot_position::text "
            "WHERE section = 'eventos'"
        )
        if conn.dialect.name == 'postgresql'
        else sa.text(
            "UPDATE ad_slots SET slot_key = section || '-' || CAST(slot_position AS TEXT) "
            "WHERE section = 'eventos'"
        )
    )

    with op.batch_alter_table('ad_slots', schema=None) as batch_op:
        batch_op.alter_column('slot_key', existing_type=sa.String(length=50), nullable=False)
        batch_op.alter_column('sort_order', server_default=None)
        batch_op.drop_column('created_at')
        batch_op.drop_column('rotation_interval_seconds')
        batch_op.drop_column('rotation_mode')
        batch_op.drop_column('slot_position')
        batch_op.drop_column('section')
