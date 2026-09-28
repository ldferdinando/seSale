"""add pending_payment to subscriptionstatus enum

Revision ID: 7c3e9f1a2b40
Revises: da5f20b4cbd9
Create Date: 2026-09-27 18:00:00.000000

Repara un drift del enum nativo `subscriptionstatus` en bases creadas desde
cero (ver a_revisar.md, "Verificación formal (protocolo A–I)"):

- 0001 crea el tipo con {active, expired, cancelled}
- 0002 dropea la tabla `subscriptions` pero NO el tipo, y el `sa.Enum(...,
  'pending_payment', name='subscriptionstatus')` del `create_table` posterior
  no le agrega valores a un tipo que ya existe
- 0009 solo agrega `pending_approval`

Resultado: una base nueva queda sin `pending_payment`, que es el default de
`Subscription.status` y el estado con el que `payment_service.py` crea las
suscripciones del checkout → error 500 en una producción creada desde cero.
Las bases que ya lo tienen (dev) no cambian: `IF NOT EXISTS` lo hace no-op.

Mismo patrón que 0009 (`op.execute` + `ADD VALUE IF NOT EXISTS`), válido
dentro de la transacción única de `alembic/env.py` (PG ≥ 12). El valor
nuevo no se usa en esta misma transacción: ninguna migración posterior lo
referencia. No se modifican 0002 ni 0009 (ya aplicadas en distintos entornos).

En SQLite el enum es un VARCHAR y 0002 ya lo crea con `pending_payment`:
no hay nada que hacer.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '7c3e9f1a2b40'
down_revision: Union[str, None] = 'da5f20b4cbd9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    if bind.dialect.name == 'postgresql':
        op.execute(
            "ALTER TYPE subscriptionstatus ADD VALUE IF NOT EXISTS 'pending_payment' BEFORE 'pending_approval'"
        )


def downgrade() -> None:
    # No-op explícito: Postgres no permite quitar un valor de un enum sin
    # recrear el tipo, y recrearlo acá rompería las bases que ya tenían
    # `pending_payment` desde antes de esta migración (dev), además de las
    # filas que lo usen. El valor queda; es inofensivo en revisiones previas.
    pass
