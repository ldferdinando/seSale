from datetime import date, datetime, time, timezone
from enum import Enum
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel

from app.models.plan import PlanType


class EventStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class TicketType(str, Enum):
    gratis = "gratis"
    pago = "pago"
    anticipo = "anticipo"


class EventMoment(str, Enum):
    diurno = "diurno"
    nocturno = "nocturno"


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
    time_end: time | None = Field(default=None)
    moment: EventMoment | None = Field(default=None)
    category: str = Field(max_length=50)

    # Estado y visibilidad
    status: EventStatus = Field(default=EventStatus.pending)
    plan: PlanType = Field(default=PlanType.gratis)
    is_featured: bool = Field(default=False)
    featured_until: datetime | None = Field(default=None)
    is_active: bool = Field(default=True)
    available_on_site: bool = Field(default=False)

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
