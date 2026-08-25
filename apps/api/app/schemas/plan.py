from uuid import UUID

from pydantic import BaseModel, ConfigDict

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
