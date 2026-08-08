from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.plan import PlanType
from app.models.subscription import SubscriptionStatus


class CheckoutRequest(BaseModel):
    plan_id: UUID


class CheckoutResponse(BaseModel):
    init_point: str


class SubscriptionRead(BaseModel):
    id: UUID
    plan_id: UUID
    plan_name: str
    plan_type: PlanType
    status: SubscriptionStatus
    starts_at: datetime
    expires_at: datetime
    amount_paid: int
    currency: str
    promo_label: str | None
    mp_payment_id: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminSubscriptionRead(SubscriptionRead):
    user_id: UUID
    user_email: str
    user_public_name: str


class AdminSubscriptionListParams(BaseModel):
    status: SubscriptionStatus | None = None
    plan_id: UUID | None = None
    user_id: UUID | None = None
    date_from: date | None = None
    date_to: date | None = None


class SubscriptionActivateRequest(BaseModel):
    expires_at: datetime
