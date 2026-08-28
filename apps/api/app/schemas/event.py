from datetime import date, datetime, time
from datetime import date as _Date
from datetime import time as _Time
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.timezone import argentina_today
from app.models.event import EventStatus, TicketType
from app.models.plan import PlanType
from app.schemas.location import LocationCreate
from app.schemas.subscription import OrganizerSubscriptionRead

MIN_CATEGORIES = 1
MAX_CATEGORIES = 3


def _validate_categories(value: list[str]) -> list[str]:
    """Solo valida forma (sin duplicados). La pertenencia a categorías
    activas (antes, un set VALID_CATEGORIES hardcodeado) se valida en
    app.services.event_service (create_event/update_event) contra la tabla
    event_categories_catalog — Etapa 12a: requiere la sesión de DB, que un
    field_validator de Pydantic no tiene."""
    if len(value) != len(set(value)):
        raise ValueError("No se pueden repetir categorías")
    return value


# Etapa 10b — coherencia de fecha/hora de inicio y fin (ver a_revisar.md).
# Reemplaza la regla de la Etapa 10a (mínimo 15' si no cruza medianoche,
# "cruza medianoche" inferido de forma implícita con time_end < time_start).
# Ahora que `date_end` es un campo explícito, la validación es directa:
# el evento tiene que terminar estrictamente después de que empieza.


def _validate_event_span(date_start: date, time_start: time, date_end: date, time_end: time) -> None:
    start = datetime.combine(date_start, time_start)
    end = datetime.combine(date_end, time_end)
    if end <= start:
        raise ValueError("La fecha y hora de fin debe ser posterior al inicio.")


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
    time_end: time  # Etapa 10a — obligatorio, ya no Optional
    date_end: date  # Etapa 10b — siempre se devuelve, ver _default_date_end
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
    contact_facebook: str | None  # Etapa 12a
    contact_web: str | None
    contact_email: str | None
    flyer_url_desktop: str | None  # Etapa 12b — antes `flyer_url`
    flyer_url_mobile: str | None  # Etapa 12b — None => se usa el de desktop
    location: LocationRead
    # Etapa 10b-2: se expone para que el organizador dueño del evento (o un
    # admin) puedan saber si su propio evento está dado de baja — antes solo
    # estaba en AdminEventRead. Sin lógica nueva, el campo ya existe en el
    # modelo desde el día 1.
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def _default_date_end(cls, data):
        """Etapa 10b — `Event.date_end` es `None` en la DB para las filas
        anteriores a esta etapa (y para cualquier evento de un solo día,
        ver el modelo). La respuesta siempre devuelve una fecha real: si es
        `None`, se completa con `date` (mismo día). `data` acá es el objeto
        ORM crudo (`from_attributes=True`) o un dict — nunca se persiste
        este fallback, solo afecta lo que se serializa en esta respuesta."""
        if isinstance(data, dict):
            if data.get("date_end") is None:
                data = {**data, "date_end": data.get("date")}
            return data
        if getattr(data, "date_end", None) is None:
            data.date_end = getattr(data, "date", None)
        return data


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
    ticket_type: str | None = None  # Etapa 12b — "gratis" | "pago" (incluye anticipo)


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
    # is_active ya viene de EventRead desde la Etapa 10b-2 (antes era
    # exclusivo de este schema).
    # Estado de pago más reciente del organizador — Etapa 6b-1, para decidir
    # si aprobar el evento sabiendo si ya avisó/confirmó el pago del plan.
    organizer_subscription: OrganizerSubscriptionRead | None = None


class EventCreate(BaseModel):
    title: str = Field(max_length=255, min_length=1)
    description: str | None = None
    date: date
    time: time
    time_end: time  # Etapa 10a — obligatorio, sin default
    # Etapa 10b: opcional — si no viene, el backend lo completa con `date`
    # (mismo día), ver el validator de abajo.
    date_end: date | None = None
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
    contact_facebook: str | None = None  # Etapa 12a
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

    @model_validator(mode="after")
    def default_date_end_and_validate_span(self) -> "EventCreate":
        if self.date_end is None:
            self.date_end = self.date
        _validate_event_span(self.date, self.time, self.date_end, self.time_end)
        return self


class EventUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255, min_length=1)
    description: str | None = None
    date: _Date | None = None
    time: _Time | None = None
    time_end: _Time | None = None
    date_end: _Date | None = None  # Etapa 10b
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
    contact_facebook: str | None = None  # Etapa 12a
    contact_web: str | None = None
    contact_email: str | None = None

    # Etapa 10b-2: autoservicio de "Dar de baja"/"Volver a publicar" para el
    # organizador dueño del evento (antes solo se podía desactivar, vía
    # DELETE /api/events/{id}, y solo en esa dirección). None = no se toca.
    # Ver update_event() en event_service.py — un payload que solo trae este
    # campo no resetea `status` a pending.
    is_active: bool | None = None

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

    @model_validator(mode="after")
    def validate_event_span_coherence(self) -> "EventUpdate":
        # En un update todos los campos son opcionales/parciales. Solo se
        # puede validar la coherencia inicio/fin cuando el payload trae
        # `time` y `time_end` juntos — si trae uno solo, el otro valor
        # vigente vive en el evento ya guardado (no acá), y no es
        # responsabilidad de este schema ir a buscarlo a la DB.
        fields = self.model_fields_set
        if "time" not in fields or "time_end" not in fields:
            return self
        if self.time is None or self.time_end is None:
            return self

        date_start = self.date if "date" in fields and self.date is not None else None
        if date_start is None:
            # No hay forma de saber la fecha vigente del evento acá (vive
            # en la DB) — como mínimo, no permitir que la hora de fin sea
            # exactamente igual a la de inicio.
            if self.time_end == self.time:
                raise ValueError("La fecha y hora de fin debe ser posterior al inicio.")
            return self

        # `date` sí vino: si `date_end` no vino, se asume el mismo día que
        # `date` (mismo default que EventCreate).
        date_end = self.date_end if "date_end" in fields and self.date_end is not None else date_start
        _validate_event_span(date_start, self.time, date_end, self.time_end)
        return self


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
    """Respuesta de POST/DELETE /api/events/{id}/flyer/{desktop|mobile}.

    Etapa 8b (flyer único) → Etapa 12b (flyer dual): siempre devuelve el
    estado completo de ambos tamaños, para que el frontend refresque las
    dos zonas con una sola respuesta."""

    flyer_url_desktop: str | None
    flyer_url_mobile: str | None
