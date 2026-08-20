from datetime import date
from enum import Enum
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel


class PlanType(str, Enum):
    gratis = "gratis"  # sin costo, sin pago
    dest = "dest"  # Destacado — precio fijo
    pro = "pro"  # Destacado Plus — precio fijo
    banner = "banner"  # Banner web — precio a convenir


class PricingType(str, Enum):
    fixed = "fixed"  # precio fijo, se paga online (MP)
    custom = "custom"  # precio a convenir, admin lo carga


class Plan(SQLModel, table=True):
    __tablename__ = "plans"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(max_length=100)
    plan_type: PlanType
    pricing_type: PricingType
    description: str | None = Field(default=None)
    is_active: bool = Field(default=True)

    prices: list["PlanPrice"] = Relationship(back_populates="plan")
    subscriptions: list["Subscription"] = Relationship(back_populates="plan")


class PlanPrice(SQLModel, table=True):
    __tablename__ = "plan_prices"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    plan_id: UUID = Field(foreign_key="plans.id")
    amount: int = Field(default=0)
    currency: str = Field(default="ARS", max_length=10)
    valid_from: date
    valid_until: date | None = Field(default=None)
    promo_label: str | None = Field(default=None)
    # Etapa 9d — nullable: la migración de datos base (0017) inserta los
    # precios placeholder de dest/pro antes de que exista ningún usuario en
    # producción (el primer admin se crea después, vía POST /api/setup/admin).
    # Confirmado con la usuaria (AskUserQuestion) antes de tocar el modelo.
    created_by: UUID | None = Field(default=None, foreign_key="users.id")
    notes: str | None = Field(default=None)

    plan: "Plan" = Relationship(back_populates="prices")
    subscriptions: list["Subscription"] = Relationship(back_populates="plan_price")
