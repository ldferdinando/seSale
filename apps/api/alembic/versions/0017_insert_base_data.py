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
etapa) — el chequeo se hace a mano con SELECT antes de cada INSERT, con un
ORM Session sobre los modelos reales (para que los enums nativos de
Postgres de Plan.plan_type/pricing_type se manejen solos), dentro de la
misma transacción que envuelve la migración.

`PlanPrice.created_by` queda NULL en las filas que crea esta migración (ver
0016_plan_price_created_by_nullable.py): no existe ningún usuario todavía
en este punto del deploy — el primer admin se crea después, vía
POST /api/setup/admin.
"""
from datetime import date
from typing import Sequence, Union
from uuid import UUID

from sqlmodel import Session, select

from alembic import op
from app.models.ad_slot import AdSlot
from app.models.city import City
from app.models.plan import Plan, PlanPrice, PlanType, PricingType

# revision identifiers, used by Alembic.
revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, None] = "9a00f728b184"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


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

PLANS = [
    {
        "name": "Gratuito",
        "plan_type": PlanType.gratis,
        "pricing_type": PricingType.fixed,
        "description": "Tu evento aparece en la lista",
        "is_active": True,
    },
    {
        "name": "Destacado",
        "plan_type": PlanType.dest,
        "pricing_type": PricingType.fixed,
        "description": "Aparece antes que los gratuitos. Podés subir un flyer.",
        "is_active": True,
    },
    {
        "name": "Destacado Plus",
        "plan_type": PlanType.pro,
        "pricing_type": PricingType.fixed,
        "description": "Máxima visibilidad. Flyer con lightbox.",
        "is_active": True,
    },
    {
        "name": "Banner web",
        "plan_type": PlanType.banner,
        "pricing_type": PricingType.custom,
        "description": "Espacio publicitario en la página. Precio a convenir.",
        "is_active": True,
    },
]

# plan_type de los planes que necesitan un PlanPrice placeholder vigente.
PLAN_TYPES_WITH_PLACEHOLDER_PRICE = (PlanType.dest, PlanType.pro)

_PLAN_PRICE_NOTES = "Precio placeholder — actualizar desde el panel admin antes del lanzamiento"


def insert_base_data(session: Session) -> None:
    """Lógica de la migración, extraída a nivel de módulo para poder
    testearla directamente con una Session de test (SQLite in-memory), sin
    necesidad de un contexto real de Alembic — mismo patrón que
    `_ad_slots_for_city` en seed.py (ver a_revisar.md, Etapa 8d-pre)."""
    today = date.today()

    # ── Ciudades ─────────────────────────────────────────────
    city_ids_by_name: dict[str, UUID] = {}
    for city_data in CITIES:
        existing = session.exec(
            select(City).where(City.name == city_data["name"], City.province == city_data["province"])
        ).first()
        if existing is not None:
            city_ids_by_name[city_data["name"]] = existing.id
            continue

        city = City(**city_data)
        session.add(city)
        session.flush()
        city_ids_by_name[city_data["name"]] = city.id

    # ── Slots de banners (ciudades activas) ─────────────────────
    for city_name in CITIES_WITH_AD_SLOTS:
        city_id = city_ids_by_name[city_name]
        for section, slot_position, rotation_mode in AD_SLOTS:
            existing = session.exec(
                select(AdSlot).where(
                    AdSlot.city_id == city_id,
                    AdSlot.section == section,
                    AdSlot.slot_position == slot_position,
                )
            ).first()
            if existing is not None:
                continue

            session.add(
                AdSlot(
                    city_id=city_id,
                    section=section,
                    slot_position=slot_position,
                    rotation_mode=rotation_mode,
                )
            )

    # ── Planes ───────────────────────────────────────────────
    plan_ids_by_type: dict[PlanType, UUID] = {}
    for plan_data in PLANS:
        existing = session.exec(select(Plan).where(Plan.plan_type == plan_data["plan_type"])).first()
        if existing is not None:
            plan_ids_by_type[plan_data["plan_type"]] = existing.id
            continue

        plan = Plan(**plan_data)
        session.add(plan)
        session.flush()
        plan_ids_by_type[plan_data["plan_type"]] = plan.id

    # ── Precios placeholder (dest/pro) ──────────────────────────
    for plan_type in PLAN_TYPES_WITH_PLACEHOLDER_PRICE:
        plan_id = plan_ids_by_type.get(plan_type)
        if plan_id is None:
            continue  # el plan no existe (no debería pasar, pero no rompe la migración)

        has_current_price = session.exec(
            select(PlanPrice).where(PlanPrice.plan_id == plan_id, PlanPrice.valid_until.is_(None))
        ).first()
        if has_current_price is not None:
            continue

        session.add(
            PlanPrice(
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

    session.commit()


def upgrade() -> None:
    insert_base_data(Session(bind=op.get_bind()))


def downgrade() -> None:
    # Migración de datos — no se revierte automáticamente (no hay forma
    # segura de distinguir estas filas de datos reales cargados después por
    # el admin). Si hace falta deshacerla, se hace a mano contra la DB.
    pass
