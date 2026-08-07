from datetime import date, datetime, time
from datetime import date as _Date
from datetime import time as _Time
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.event import EventMoment, EventStatus, TicketType
from app.models.plan import PlanType

VALID_CATEGORIES = {
    "musica",
    "fiesta",
    "teatro",
    "feria",
    "dj",
    "milonga",
    "pena",
    "standup",
    "arte",
    "recital",
    "cine",
    "infantil",
    "deportes",
}


class LocationRead(BaseModel):
    id: UUID
    name: str
    address: str
    city_id: UUID
    latitude: float | None
    longitude: float | None

    model_config = ConfigDict(from_attributes=True)


class EventRead(BaseModel):
    id: UUID
    city_id: UUID
    organizer_id: UUID
    location_id: UUID
    title: str
    description: str | None
    date: date
    time: time
    time_end: time | None
    moment: EventMoment | None
    category: str
    status: EventStatus
    plan: PlanType
    is_featured: bool
    featured_until: datetime | None
    ticket_type: TicketType
    price_at_door: int | None
    price_advance: int | None
    available_on_site: bool
    contact_whatsapp: str | None
    contact_instagram: str | None
    contact_web: str | None
    contact_email: str | None
    flyer_url: str | None
    location: LocationRead

    model_config = ConfigDict(from_attributes=True)


class OrganizerPublicRead(BaseModel):
    public_name: str
    public_whatsapp: str | None
    city: str | None

    model_config = ConfigDict(from_attributes=True)


class EventDetailRead(EventRead):
    organizer_id: UUID
    city_name: str
    organizer: OrganizerPublicRead


class EventListParams(BaseModel):
    city_id: UUID | None = None
    category: str | None = None
    date_from: date | None = None
    date_to: date | None = None
    search: str | None = None


class AdminEventListParams(BaseModel):
    status: EventStatus | None = None
    city_id: UUID | None = None
    category: str | None = None
    plan: PlanType | None = None
    search: str | None = None
    date_from: date | None = None
    date_to: date | None = None
    limit: int = Field(default=50, le=200, ge=1)
    offset: int = Field(default=0, ge=0)


class AdminEventRead(EventRead):
    organizer_public_name: str
    is_active: bool


class EventCreate(BaseModel):
    title: str = Field(max_length=255, min_length=1)
    description: str | None = None
    date: date
    time: time
    time_end: time | None = None
    moment: EventMoment | None = None
    category: str

    # Solo tiene efecto si quien crea el evento es admin (Etapa 5.6): permite
    # cargar el evento en nombre de otro organizador. Un "user" lo ignora
    # aunque lo mande — el organizador siempre es el usuario autenticado.
    organizer_id: UUID | None = None

    location_name: str = Field(max_length=255, min_length=1)
    location_address: str = Field(max_length=500, min_length=1)

    ticket_type: TicketType = TicketType.gratis
    price_at_door: int | None = Field(default=None, ge=0)
    price_advance: int | None = Field(default=None, ge=0)
    available_on_site: bool = False

    contact_whatsapp: str | None = None
    contact_instagram: str | None = None
    contact_web: str | None = None
    contact_email: str | None = None

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str) -> str:
        if value not in VALID_CATEGORIES:
            raise ValueError(f"Categoría inválida: {value}")
        return value

    @field_validator("date")
    @classmethod
    def validate_date_not_past(cls, value: date) -> date:
        if value < date.today():
            raise ValueError("La fecha del evento no puede estar en el pasado")
        return value


class EventUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255, min_length=1)
    description: str | None = None
    date: _Date | None = None
    time: _Time | None = None
    time_end: _Time | None = None
    moment: EventMoment | None = None
    category: str | None = None

    location_name: str | None = Field(default=None, max_length=255, min_length=1)
    location_address: str | None = Field(default=None, max_length=500, min_length=1)

    ticket_type: TicketType | None = None
    price_at_door: int | None = Field(default=None, ge=0)
    price_advance: int | None = Field(default=None, ge=0)
    available_on_site: bool | None = None

    contact_whatsapp: str | None = None
    contact_instagram: str | None = None
    contact_web: str | None = None
    contact_email: str | None = None

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str | None) -> str | None:
        if value is not None and value not in VALID_CATEGORIES:
            raise ValueError(f"Categoría inválida: {value}")
        return value

    @field_validator("date")
    @classmethod
    def validate_date_not_past(cls, value: _Date | None) -> _Date | None:
        if value is not None and value < _Date.today():
            raise ValueError("La fecha del evento no puede estar en el pasado")
        return value


class EventStatusUpdate(BaseModel):
    status: EventStatus

    @field_validator("status")
    @classmethod
    def validate_moderatable_status(cls, value: EventStatus) -> EventStatus:
        if value not in (EventStatus.approved, EventStatus.rejected):
            raise ValueError("El status solo puede actualizarse a approved o rejected")
        return value


class EventFeaturedUpdate(BaseModel):
    is_featured: bool
    featured_until: datetime | None = None


class EventPlanUpdate(BaseModel):
    plan: PlanType


class EventsByStatus(BaseModel):
    pending: list[EventRead]
    approved: list[EventRead]
    rejected: list[EventRead]
