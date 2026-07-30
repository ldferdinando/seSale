from datetime import datetime, timezone
from enum import Enum
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel

from app.models.event import EventPlan


class SubscriptionStatus(str, Enum):
    active = "active"
    expired = "expired"
    cancelled = "cancelled"


class Subscription(SQLModel, table=True):
    __tablename__ = "subscriptions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id")
    plan: EventPlan  # dest | pro (no gratis)
    status: SubscriptionStatus = Field(default=SubscriptionStatus.active)
    started_at: datetime
    expires_at: datetime
    amount: int
    mp_payment_id: str | None = Field(default=None)
    mp_subscription_id: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    user: "User" = Relationship(back_populates="subscriptions")
