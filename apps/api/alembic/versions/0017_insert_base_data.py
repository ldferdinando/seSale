"""insert_base_data

Revision ID: b1c2d3e4f5a6
Revises: 9a00f728b184
Create Date: 2026-08-20 10:30:00.000000

Etapa 9d — Parte 2. Migración de DATOS (no de esquema): en producción no
corre `seed.py` (son datos de prueba). Esta migración inserta los datos
mínimos que la app necesita para funcionar: las 6 ciudades, los slots de
banners vacíos de las ciudades activas y los 4 planes de visibilidad (con
precio placeholder $0 para dest/pro).

Idempotente: cada bloque busca por su clave natural (name+province para
City, city_id+section+slot_position para AdSlot — ya tiene
UniqueConstraint, plan_type para Plan, "PlanPrice vigente" para PlanPrice)
antes de insertar, así correrla dos veces no duplica nada. No usa
`INSERT ... ON CONFLICT` porque City/Plan no tienen una constraint UNIQUE
sobre esas claves naturales (agregarla no formaba parte del pedido de esta
etapa) — el chequeo se hace a mano con SELECT antes de cada INSERT.

Fix (2026-09-27): esta migración usaba los modelos ORM ACTUALES de la app
(`AdSlot`, `City`, `Plan`, `PlanPrice`) — `select(AdSlot)`/`AdSlot(**data)`
generan SQL que incluye TODAS las columnas del modelo tal como está HOY en
el código, no como estaba `ad_slots` en este punto de la historia. Cuando
se agregó `category_key` a `AdSlot` (migración 0024, posterior a esta), una
base nueva corriendo `alembic upgrade head` desde cero rompía acá con
`UndefinedColumn: column ad_slots.category_key does not exist` — en
staging/local no se notó porque esas bases ya habían pasado esta migración
antes de que `AdSlot` ganara esa columna. Reescrita para usar tablas
"livianas" (`sa.table`/`sa.column`, solo con las columnas que existen en
`ad_slots`/`cities`/`plans`/`plan_prices` en este punto exacto de la
historia de migraciones) en vez de los modelos reales — ya no depende del
código actual de la app, solo del esquema tal como lo dejaron las
migraciones anteriores a esta. Mismo dato insertado, mismo comportamiento
idempotente — ver a_revisar.md para el detalle completo y la convención
recomendada para migraciones de datos futuras.

`PlanPrice.created_by` queda NULL en las filas que crea esta migración (ver
0016_plan_price_created_by_nullable.py): no existe ningún usuario todavía
en este punto del deploy — el primer admin se crea después, vía
POST /api/setup/admin.
"""
import uuid
from datetime import date, datetime, timezone
from typing import Sequence, Union

import sqlalchemy as sa
from sqlmodel.sql.sqltypes import GUID

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, None] = "9a00f728b184"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ── Tablas livianas — SOLO las columnas que existen en este punto de la
#    historia (entre 0016 y 0018), no las del modelo actual. ────────────

cities_table = sa.table(
    "cities",
    sa.column("id", GUID()),
    sa.column("name", sa.String(length=100)),
    sa.column("province", sa.String(length=100)),
    sa.column("emoji", sa.String(length=10)),
    sa.column("is_active", sa.Boolean()),
    sa.column("sort_order", sa.Integer()),
    sa.column("latitude", sa.Float()),
    sa.column("longitude", sa.Float()),
)

# `ad_slots` en este punto (después de 0013, antes de 0024 que agrega
# `category_key`): sin category_key, sin sort_order/slot_key (los perdió en
# 0013).
ad_slots_table = sa.table(
    "ad_slots",
    sa.column("id", GUID()),
    sa.column("city_id", GUID()),
    sa.column("section", sa.String(length=20)),
    sa.column("slot_position", sa.Integer()),
    sa.column("rotation_mode", sa.String(length=20)),
    sa.column("rotation_interval_seconds", sa.Integer()),
    sa.column("created_at", sa.DateTime()),
    sa.column("is_active", sa.Boolean()),
)

plans_table = sa.table(
    "plans",
    sa.column("id", GUID()),
    sa.column("name", sa.String(length=100)),
    sa.column("plan_type", sa.Enum("gratis", "dest", "pro", "banner", name="plantype")),
    sa.column("pricing_type", sa.Enum("fixed", "custom", name="pricingtype")),
    sa.column("description", sa.String()),
    sa.column("is_active", sa.Boolean()),
)

# `plan_prices.created_by` ya es nullable acá (ver 0016, previa a esta).
plan_prices_table = sa.table(
    "plan_prices",
    sa.column("id", GUID()),
    sa.column("plan_id", GUID()),
    sa.column("amount", sa.Integer()),
    sa.column("currency", sa.String(length=10)),
    sa.column("valid_from", sa.Date()),
    sa.column("valid_until", sa.Date()),
    sa.column("promo_label", sa.String()),
    sa.column("created_by", GUID()),
    sa.column("notes", sa.String()),
)


CITIES = [
    {
        "name": "General Roca",
        "province": "Río Negro",
        "emoji": "🏙️",
        "latitude": -39.0333,
        "longitude": -67.5833,
        "is_active": True,
        "sort_order": 1,
    },
    {
        "name": "Cipolletti",
        "province": "Río Negro",
        "emoji": "🌆",
        "latitude": -38.9333,
        "longitude": -68.0000,
        "is_active": True,
        "sort_order": 2,
    },
    {
        "name": "Neuquén",
        "province": "Neuquén",
        "emoji": "🏔️",
        "latitude": -38.9516,
        "longitude": -68.0591,
        "is_active": False,
        "sort_order": 3,
    },
    {
        "name": "Allen",
        "province": "Río Negro",
        "emoji": "🍎",
        "latitude": -38.9833,
        "longitude": -67.8333,
        "is_active": False,
        "sort_order": 4,
    },
    {
        "name": "Villa Regina",
        "province": "Río Negro",
        "emoji": "🌿",
        "latitude": -39.1000,
        "longitude": -67.0667,
        "is_active": False,
        "sort_order": 5,
    },
    {
        "name": "Cinco Saltos",
        "province": "Río Negro",
        "emoji": "💧",
        "latitude": -38.8167,
        "longitude": -68.0667,
        "is_active": False,
        "sort_order": 6,
    },
]

# (section, slot_position, rotation_mode) — el pedido original lista 8
# posiciones (eventos: 3, eventos-grid: 2, gastronomia: 3) pero dice
# "Total: 7 slots por ciudad" — inconsistencia aritmética del pedido (3+2+3=8,
# no 7). Se prioriza la lista explícita de posiciones sobre el total en
# texto — ver a_revisar.md.
AD_SLOTS = [
    ("eventos", 0, "sequential"),
    ("eventos", 1, "sequential"),
    ("eventos", 2, "sequential"),
    ("eventos-grid", 0, "random"),
    ("eventos-grid", 1, "random"),
    ("gastronomia", 0, "sequential"),
    ("gastronomia", 1, "sequential"),
    ("gastronomia", 2, "sequential"),
]

# Ciudades para las que se crean los AdSlot (coincide con "ciudad activa"
# al momento de escribir esta migración: General Roca y Cipolletti).
CITIES_WITH_AD_SLOTS = {"General Roca", "Cipolletti"}

# plan_type/pricing_type como strings planas (valores del Enum nativo de
# Postgres `plantype`/`pricingtype` creado en 0002_pricing_system.py) — no
# se importa `app.models.plan.PlanType/PricingType`, ver docstring.
PLANS = [
    {
        "name": "Gratuito",
        "plan_type": "gratis",
        "pricing_type": "fixed",
        "description": "Tu evento aparece en la lista",
        "is_active": True,
    },
    {
        "name": "Destacado",
        "plan_type": "dest",
        "pricing_type": "fixed",
        "description": "Aparece antes que los gratuitos. Podés subir un flyer.",
        "is_active": True,
    },
    {
        "name": "Destacado Plus",
        "plan_type": "pro",
        "pricing_type": "fixed",
        "description": "Máxima visibilidad. Flyer con lightbox.",
        "is_active": True,
    },
    {
        "name": "Banner web",
        "plan_type": "banner",
        "pricing_type": "custom",
        "description": "Espacio publicitario en la página. Precio a convenir.",
        "is_active": True,
    },
]

# plan_type de los planes que necesitan un PlanPrice placeholder vigente.
PLAN_TYPES_WITH_PLACEHOLDER_PRICE = ("dest", "pro")

_PLAN_PRICE_NOTES = "Precio placeholder — actualizar desde el panel admin antes del lanzamiento"


def insert_base_data(conn) -> None:
    """Lógica de la migración, extraída a nivel de módulo para poder
    testearla directamente contra una conexión de test (SQLite in-memory),
    sin necesidad de un contexto real de Alembic — mismo patrón que
    `_ad_slots_for_city` en seed.py (ver a_revisar.md, Etapa 8d-pre).

    `conn` acepta tanto una `Connection` de SQLAlchemy (uso real, ver
    `upgrade()`) como una `Session` (ORM o SQLModel, uso en tests) — solo
    se usa `.execute()`, presente en ambas. A propósito NO llama
    `.commit()`: `upgrade()` corre dentro de la transacción única que
    `alembic/env.py` abre para todo `alembic upgrade` (Postgres soporta DDL
    transaccional) — commitear acá adentro cortaría esa transacción a la
    mitad y dejaría sin persistir cualquier migración posterior que corra
    en la misma invocación (confirmado con un `upgrade head` de punta a
    punta contra una base nueva — ver a_revisar.md)."""
    today = date.today()
    now = datetime.now(timezone.utc)

    # ── Ciudades ─────────────────────────────────────────────
    city_ids_by_name: dict[str, uuid.UUID] = {}
    for city_data in CITIES:
        existing = conn.execute(
            sa.select(cities_table.c.id).where(
                cities_table.c.name == city_data["name"],
                cities_table.c.province == city_data["province"],
            )
        ).first()
        if existing is not None:
            city_ids_by_name[city_data["name"]] = existing[0]
            continue

        city_id = uuid.uuid4()
        conn.execute(sa.insert(cities_table).values(id=city_id, **city_data))
        city_ids_by_name[city_data["name"]] = city_id

    # ── Slots de banners (ciudades activas) ─────────────────────
    for city_name in CITIES_WITH_AD_SLOTS:
        city_id = city_ids_by_name[city_name]
        for section, slot_position, rotation_mode in AD_SLOTS:
            existing = conn.execute(
                sa.select(ad_slots_table.c.id).where(
                    ad_slots_table.c.city_id == city_id,
                    ad_slots_table.c.section == section,
                    ad_slots_table.c.slot_position == slot_position,
                )
            ).first()
            if existing is not None:
                continue

            conn.execute(
                sa.insert(ad_slots_table).values(
                    id=uuid.uuid4(),
                    city_id=city_id,
                    section=section,
                    slot_position=slot_position,
                    rotation_mode=rotation_mode,
                    rotation_interval_seconds=3,
                    created_at=now,
                    is_active=True,
                )
            )

    # ── Planes ───────────────────────────────────────────────
    plan_ids_by_type: dict[str, uuid.UUID] = {}
    for plan_data in PLANS:
        existing = conn.execute(
            sa.select(plans_table.c.id).where(plans_table.c.plan_type == plan_data["plan_type"])
        ).first()
        if existing is not None:
            plan_ids_by_type[plan_data["plan_type"]] = existing[0]
            continue

        plan_id = uuid.uuid4()
        conn.execute(sa.insert(plans_table).values(id=plan_id, **plan_data))
        plan_ids_by_type[plan_data["plan_type"]] = plan_id

    # ── Precios placeholder (dest/pro) ──────────────────────────
    for plan_type in PLAN_TYPES_WITH_PLACEHOLDER_PRICE:
        plan_id = plan_ids_by_type.get(plan_type)
        if plan_id is None:
            continue  # el plan no existe (no debería pasar, pero no rompe la migración)

        has_current_price = conn.execute(
            sa.select(plan_prices_table.c.id).where(
                plan_prices_table.c.plan_id == plan_id,
                plan_prices_table.c.valid_until.is_(None),
            )
        ).first()
        if has_current_price is not None:
            continue

        conn.execute(
            sa.insert(plan_prices_table).values(
                id=uuid.uuid4(),
                plan_id=plan_id,
                amount=0,
                currency="ARS",
                valid_from=today,
                valid_until=None,
                promo_label=None,
                created_by=None,
                notes=_PLAN_PRICE_NOTES,
            )
        )


def upgrade() -> None:
    insert_base_data(op.get_bind())


def downgrade() -> None:
    # Migración de datos — no se revierte automáticamente (no hay forma
    # segura de distinguir estas filas de datos reales cargados después por
    # el admin). Si hace falta deshacerla, se hace a mano contra la DB.
    pass
