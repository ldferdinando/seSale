"""security: enable RLS on all public tables (Supabase Security Advisor)

Revision ID: 7c1e4b9a2f30
Revises: 9b3e7f1c6a04
Create Date: 2026-10-28 00:00:00.000000

Supabase Security Advisor (Advisors -> Security Advisor) reportó las 18
tablas de abajo con "RLS Disabled in Public" (accesibles sin restricción
vía la API REST automática de Supabase, PostgREST) + "Sensitive Columns
Exposed" en `password_reset_tokens`.

El backend nunca usa PostgREST: conecta a Postgres directo vía
SQLModel/SQLAlchemy (`psycopg`, ver `DATABASE_URL` / `core/deps.py`), y el
único uso de `supabase-py` en el proyecto es contra Supabase Storage
(buckets), nunca contra tablas (ver `core/storage.py`). Activar RLS SIN
políticas deniega todo acceso vía PostgREST por default, que es
exactamente lo que se quiere — no hace falta escribir políticas porque
nada legítimo depende de esa API para estas tablas.

En local/dev, el rol de `DATABASE_URL` (`sesale`, ver docker-compose.yml)
es el `POSTGRES_USER` con el que se inicializa el contenedor, por lo que
es superusuario de ese Postgres y bypassea RLS: esta migración no cambia
ningún comportamiento de la app en local.

IMPORTANTE — antes de aplicar en producción: confirmar que el rol con el
que conecta `DATABASE_URL` en Railway tiene el atributo BYPASSRLS (en
Supabase, el rol default `postgres` lo tiene). Si no lo tiene, esta
migración puede cortar queries reales del backend. Ver `a_revisar.md`.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7c1e4b9a2f30"
down_revision: Union[str, None] = "9b3e7f1c6a04"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Las 18 tablas de public.* reportadas por el Security Advisor con
# "RLS Disabled in Public" (incluye alembic_version, que Alembic crea
# automáticamente y Supabase también la expone por default).
TABLES = [
    "alembic_version",
    "plan_prices",
    "plans",
    "event_categories",
    "event_moments",
    "subscriptions",
    "cities",
    "ad_items",
    "locations",
    "location_gastro_types",
    "password_reset_tokens",
    "event_categories_catalog",
    "ad_slots",
    "reports",
    "users",
    "gastro_types_catalog",
    "site_settings",
    "events",
]


def upgrade() -> None:
    for table in TABLES:
        op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    for table in TABLES:
        op.execute(f"ALTER TABLE public.{table} DISABLE ROW LEVEL SECURITY")
