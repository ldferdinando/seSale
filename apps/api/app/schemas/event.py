from datetime import date, time
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.event import EventStatus, TicketType
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
    location_id: UUID
    title: str
    description: str | None
    date: date
    time: time
    category: str
    status: EventStatus
    plan: PlanType
    is_featured: bool
    ticket_type: TicketType
    price_at_door: int | None
    price_advance: int | None
    contact_whatsapp: str | None
    contact_instagram: str | None
    contact_web: str | None
    contact_email: str | None
    flyer_url: str | None
    location: LocationRead

    model_config = ConfigDict(from_attributes=True)


class EventListParams(BaseModel):
    city_id: UUID | None = None
    category: str | None = None
    date_from: date | None = None
    date_to: date | None = None
    search: str | None = None


class EventCreate(BaseModel):
    user_id: UUID  # reemplazado por auth real (JWT) en Etapa 3

    title: str = Field(max_length=255, min_length=1)
    description: str | None = None
    date: date
    time: time
    category: str

    location_name: str = Field(max_length=255, min_length=1)
    location_address: str = Field(max_length=500, min_length=1)

    ticket_type: TicketType = TicketType.gratis
    price_at_door: int | None = Field(default=None, ge=0)
    price_advance: int | None = Field(default=None, ge=0)

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


class EventStatusUpdate(BaseModel):
    status: EventStatus

    @field_validator("status")
    @classmethod
    def validate_moderatable_status(cls, value: EventStatus) -> EventStatus:
        if value not in (EventStatus.approved, EventStatus.rejected):
            raise ValueError("El status solo puede actualizarse a approved o rejected")
        return value


class EventsByStatus(BaseModel):
    pending: list[EventRead]
    approved: list[EventRead]
    rejected: list[EventRead]
