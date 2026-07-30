from datetime import date, datetime, time, timezone
from enum import Enum
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel


class EventStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class EventPlan(str, Enum):
    gratis = "gratis"
    dest = "dest"
    pro = "pro"


class TicketType(str, Enum):
    gratis = "gratis"
    pago = "pago"
    anticipo = "anticipo"


class Event(SQLModel, table=True):
    __tablename__ = "events"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    city_id: UUID = Field(foreign_key="cities.id", index=True)
    organizer_id: UUID = Field(foreign_key="users.id")
    location_id: UUID = Field(foreign_key="locations.id")

    # Datos principales
    title: str = Field(max_length=255)
    description: str | None = Field(default=None)
    date: date
    time: time
    category: str = Field(max_length=50)

    # Estado y visibilidad
    status: EventStatus = Field(default=EventStatus.pending)
    plan: EventPlan = Field(default=EventPlan.gratis)
    is_featured: bool = Field(default=False)
    featured_until: datetime | None = Field(default=None)
    is_active: bool = Field(default=True)

    # Entradas
    ticket_type: TicketType = Field(default=TicketType.gratis)
    price_at_door: int | None = Field(default=None)
    price_advance: int | None = Field(default=None)

    # Contacto
    contact_whatsapp: str | None = Field(default=None)
    contact_instagram: str | None = Field(default=None)
    contact_web: str | None = Field(default=None)
    contact_email: str | None = Field(default=None)

    # Media
    flyer_url: str | None = Field(default=None)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    city: "City" = Relationship(back_populates="events")
    organizer: "User" = Relationship(back_populates="organized_events")
    location: "Location" = Relationship(back_populates="events")
