from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.plan import PlanType, PricingType


class PlanPriceRead(BaseModel):
    id: UUID
    amount: int
    currency: str
    promo_label: str | None

    model_config = ConfigDict(from_attributes=True)


class PlanRead(BaseModel):
    id: UUID
    name: str
    plan_type: PlanType
    pricing_type: PricingType
    description: str | None
    is_active: bool
    price: PlanPriceRead | None

    # Etapa 11a — BUG 2: mientras MERCADOPAGO_ACCESS_TOKEN no esté
    # configurado (pagos manuales por ahora), el frontend usa este flag
    # para ocultar "Contratar por MercadoPago" y dejar solo la opción de
    # transferencia manual — evita el 400 crudo de la SDK de MP al armar
    # la preferencia sin token. Repetido en cada item (no hay un endpoint
    # separado para esto todavía) a propósito para no romper el shape de
    # `GET /api/plans` (array plano) que ya consume `usePlans()`.
    mercadopago_available: bool

    model_config = ConfigDict(from_attributes=True)


# ── Admin: precios de planes ────────────────────────────────────────────────

PLAN_PRICE_MAX_AMOUNT = 100_000_000


class PlanPriceAdminRead(BaseModel):
    id: UUID
    amount: int
    currency: str
    valid_from: date
    valid_until: date | None
    promo_label: str | None
    notes: str | None

    model_config = ConfigDict(from_attributes=True)


class PlanPricingAdminRead(BaseModel):
    """GET /api/admin/plans — plan pago con su precio vigente e historial reciente."""

    id: UUID
    name: str
    plan_type: PlanType
    is_active: bool
    current_price: PlanPriceAdminRead | None
    history: list[PlanPriceAdminRead]


class PlanPriceCreate(BaseModel):
    """POST /api/admin/plans/{plan_id}/prices — la moneda es siempre ARS
    (no se recibe) y la vigencia arranca hoy (la calcula el backend)."""

    amount: int = Field(gt=0, le=PLAN_PRICE_MAX_AMOUNT)
    promo_label: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None, max_length=500)

    @field_validator("promo_label", "notes")
    @classmethod
    def blank_to_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None
