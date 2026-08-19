from datetime import date, datetime, time
from datetime import date as _Date
from datetime import time as _Time
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.timezone import argentina_today
from app.models.event import EventStatus, TicketType
from app.models.plan import PlanType
from app.schemas.location import LocationCreate
from app.schemas.subscription import OrganizerSubscriptionRead

MIN_CATEGORIES = 1
MAX_CATEGORIES = 3

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


def _validate_categories(value: list[str]) -> list[str]:
    if len(value) != len(set(value)):
        raise ValueError("No se pueden repetir categorías")
    invalid = [v for v in value if v not in VALID_CATEGORIES]
    if invalid:
        raise ValueError(f"Categoría inválida: {invalid[0]}")
    return value


class LocationRead(BaseModel):
    id: UUID
    name: str
    address: str
    city_id: UUID
    latitude: float | None
    longitude: float | None
    # Etapa 7b
    description: str | None = None
    hours: str | None = None
    place_type: str | None = None
    is_verified: bool = False
    is_public: bool = False

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
    categories: list[str]
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

    # Etapa 9a — banner "Organizador verificado" con datos reales. Privacidad:
    # solo se exponen señales booleanas y el mes/año de alta, nunca el dato
    # verificado en sí (doc_type/doc_number/phone/full_name/email siguen sin
    # exponerse acá).
    is_verified: bool
    phone_verified: bool
    email_verified: bool
    member_since: date  # solo fecha (derivado de User.created_at, sin hora)

    model_config = ConfigDict(from_attributes=True)


class EventDetailRead(EventRead):
    organizer_id: UUID
    city_name: str
    organizer: OrganizerPublicRead
    # Solo el propio organizador o un admin lo ven (nunca en vista pública) —
    # el router lo completa condicionalmente. Etapa 6b-1.
    organizer_subscription: OrganizerSubscriptionRead | None = None


class EventListParams(BaseModel):
    city_id: UUID | None = None
    category: list[str] | None = None
    moment: str | None = None
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
    # Estado de pago más reciente del organizador — Etapa 6b-1, para decidir
    # si aprobar el evento sabiendo si ya avisó/confirmó el pago del plan.
    organizer_subscription: OrganizerSubscriptionRead | None = None


class EventCreate(BaseModel):
    title: str = Field(max_length=255, min_length=1)
    description: str | None = None
    date: date
    time: time
    time_end: time | None = None
    categories: list[str] = Field(min_length=MIN_CATEGORIES, max_length=MAX_CATEGORIES)

    # Solo tiene efecto si quien crea el evento es admin (Etapa 5.6): permite
    # cargar el evento en nombre de otro organizador. Un "user" lo ignora
    # aunque lo mande — el organizador siempre es el usuario autenticado.
    organizer_id: UUID | None = None

    # Etapa 7a: ciudad del evento, elegida por el organizador en el
    # formulario. None = default (ciudad del organizador). Debe ser una
    # ciudad activa — se valida en el service.
    city_id: UUID | None = None

    # Etapa 7b: la ubicación se elige por uno de estos dos caminos (nunca los
    # dos): location_id apunta a un lugar ya existente (precargado por el
    # admin o creado antes por otro organizador); location_data crea un
    # Location nuevo con is_public=False a partir de dirección libre +
    # coordenadas del mapa. Si vienen los dos, se usa location_id y se
    # ignora location_data. Si no viene ninguno, 422 (se valida en el
    # servicio, no acá, porque requiere lógica de "al menos uno").
    location_id: UUID | None = None
    location_data: LocationCreate | None = None

    ticket_type: TicketType = TicketType.gratis
    price_at_door: int | None = Field(default=None, ge=0)
    price_advance: int | None = Field(default=None, ge=0)
    available_on_site: bool = False

    contact_whatsapp: str | None = None
    contact_instagram: str | None = None
    contact_web: str | None = None
    contact_email: str | None = None

    # Etapa 9b: el organizador elige la visibilidad en el resumen (Paso 2),
    # no en este formulario. gratis (default) publica directo; dest/pro se
    # ignoran acá si no hay pago confirmado — ver create_event/a_revisar.md.
    # No admite "banner" (no es un plan de evento, es un espacio publicitario
    # aparte).
    plan: PlanType = PlanType.gratis

    @field_validator("plan")
    @classmethod
    def validate_plan(cls, value: PlanType) -> PlanType:
        if value == PlanType.banner:
            raise ValueError("El plan 'banner' no es válido para un evento")
        return value

    @field_validator("categories")
    @classmethod
    def validate_categories(cls, value: list[str]) -> list[str]:
        return _validate_categories(value)

    @field_validator("date")
    @classmethod
    def validate_date_not_past(cls, value: date) -> date:
        if value < argentina_today():
            raise ValueError("La fecha del evento no puede estar en el pasado")
        return value


class EventUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255, min_length=1)
    description: str | None = None
    date: _Date | None = None
    time: _Time | None = None
    time_end: _Time | None = None
    categories: list[str] | None = Field(default=None, min_length=MIN_CATEGORIES, max_length=MAX_CATEGORIES)

    # Etapa 7a: cambiar la ciudad del evento. None = no se toca.
    city_id: UUID | None = None

    # Etapa 7b — ver EventCreate. None en ambos = no se toca la ubicación
    # actual del evento.
    location_id: UUID | None = None
    location_data: LocationCreate | None = None

    ticket_type: TicketType | None = None
    price_at_door: int | None = Field(default=None, ge=0)
    price_advance: int | None = Field(default=None, ge=0)
    available_on_site: bool | None = None

    contact_whatsapp: str | None = None
    contact_instagram: str | None = None
    contact_web: str | None = None
    contact_email: str | None = None

    @field_validator("categories")
    @classmethod
    def validate_categories(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return value
        return _validate_categories(value)

    @field_validator("date")
    @classmethod
    def validate_date_not_past(cls, value: _Date | None) -> _Date | None:
        if value is not None and value < argentina_today():
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


class FlyerUploadResponse(BaseModel):
    """Respuesta de POST/DELETE /api/events/{id}/flyer — Etapa 8b."""

    flyer_url: str | None
