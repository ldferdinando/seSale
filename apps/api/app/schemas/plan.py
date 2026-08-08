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

    model_config = ConfigDict(from_attributes=True)
