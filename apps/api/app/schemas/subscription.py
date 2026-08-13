from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.plan import PlanType
from app.models.subscription import SubscriptionStatus


class CheckoutRequest(BaseModel):
    plan_id: UUID
    # Etapa 6b-2: el plan se compra PARA un evento puntual, no para toda la
    # cuenta del organizador — obligatorio para dest/pro.
    event_id: UUID


class CheckoutResponse(BaseModel):
    init_point: str


class TransferSubscriptionRequest(BaseModel):
    plan_id: UUID
    event_id: UUID
    note: str | None = Field(default=None, max_length=1000)


class SubscriptionRead(BaseModel):
    id: UUID
    plan_id: UUID
    plan_name: str
    plan_type: PlanType
    status: SubscriptionStatus
    payment_method: str
    starts_at: datetime
    expires_at: datetime
    amount_paid: int
    currency: str
    promo_label: str | None
    mp_payment_id: str | None
    transfer_note: str | None
    reviewed_at: datetime | None
    created_at: datetime
    event_id: UUID | None
    event_title: str | None

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


class SubscriptionReviewRequest(BaseModel):
    action: Literal["approve", "reject"]
    admin_notes: str | None = Field(default=None, max_length=1000)


class OrganizerSubscriptionRead(BaseModel):
    """Estado de pago del plan comprado PARA ESTE evento puntual — Etapa 6b-1/6b-2.

    Pese al nombre (histórico), representa la Subscription ligada a
    `Subscription.event_id == este evento` (no "la última del organizador en
    general" — eso mezclaba el estado de un evento con el de otro sin
    relación, ver a_revisar.md). Se expone en EventDetailRead/AdminEventRead
    solo para el propio organizador o un admin (nunca en responses públicas).
    """

    status: SubscriptionStatus
    payment_method: str
    plan_name: str
    plan_type: PlanType
    transfer_note: str | None
    created_at: datetime
    reviewed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
