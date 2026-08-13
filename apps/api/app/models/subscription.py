from datetime import datetime, timezone
from enum import Enum
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel


class SubscriptionStatus(str, Enum):
    active = "active"
    expired = "expired"
    cancelled = "cancelled"
    pending_payment = "pending_payment"
    pending_approval = "pending_approval"  # aviso de transferencia, esperando revisión del admin — Etapa 6b-1


class Subscription(SQLModel, table=True):
    __tablename__ = "subscriptions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id")
    plan_id: UUID = Field(foreign_key="plans.id")
    plan_price_id: UUID = Field(foreign_key="plan_prices.id")  # precio congelado al momento de compra
    status: SubscriptionStatus = Field(default=SubscriptionStatus.pending_payment)
    starts_at: datetime
    expires_at: datetime
    mp_payment_id: str | None = Field(default=None)  # solo para fixed
    mp_subscription_id: str | None = Field(default=None)
    amount_paid: int  # lo que efectivamente pagó, copia del price al momento
    currency: str = Field(default="ARS", max_length=10)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    approved_by: UUID | None = Field(default=None, foreign_key="users.id")  # admin que aprobó/rechazó (custom/banner/transfer)
    notes: str | None = Field(default=None)  # notas del admin al aprobar o rechazar

    # Etapa 6b-1 — pago manual con aviso de transferencia
    payment_method: str = Field(default="mercadopago")  # "mercadopago" | "transfer" | "manual"
    transfer_note: str | None = Field(default=None)  # nota del usuario al avisar la transferencia
    reviewed_at: datetime | None = Field(default=None)  # cuándo approved_by revisó (aprobó/rechazó)

    # Etapa 6b-2: el pago es POR EVENTO, no por cuenta del organizador — un
    # plan dest/pro se compra para destacar un evento puntual (elegido al
    # momento de pagar), y solo ese evento se actualiza al aprobarse.
    # None únicamente para el plan Banner (pricing_type=custom, no es un
    # upgrade de un evento sino un espacio publicitario del sitio).
    event_id: UUID | None = Field(default=None, foreign_key="events.id")

    user: "User" = Relationship(
        back_populates="subscriptions",
        sa_relationship_kwargs={"foreign_keys": "[Subscription.user_id]"},
    )
    plan: "Plan" = Relationship(back_populates="subscriptions")
    plan_price: "PlanPrice" = Relationship(back_populates="subscriptions")
    event: "Event" = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Subscription.event_id]"}
    )
