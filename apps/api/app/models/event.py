from datetime import date, datetime, time, timezone
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, Index
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


class Event(SQLModel, table=True):
    __tablename__ = "events"
    # Índices trigram de la búsqueda pública (migración 0032). Declarados acá
    # para que `alembic check`/autogenerate no los detecte como drift; en
    # SQLite (tests) los kwargs postgresql_* se ignoran y quedan como btree.
    __table_args__ = (
        Index(
            "ix_events_title_trgm", "title", postgresql_using="gin", postgresql_ops={"title": "gin_trgm_ops"}
        ),
        Index(
            "ix_events_description_trgm",
            "description",
            postgresql_using="gin",
            postgresql_ops={"description": "gin_trgm_ops"},
        ),
        # Migración 0034: un evento tiene exactamente una referencia de
        # ubicación — un Location vinculado (location_id) o una dirección
        # libre (location_text), nunca las dos ni ninguna.
        CheckConstraint(
            "(location_id IS NULL) <> (location_text IS NULL)",
            name="ck_events_location_id_xor_location_text",
        ),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    city_id: UUID = Field(foreign_key="cities.id", index=True)
    organizer_id: UUID = Field(foreign_key="users.id")
    # Migración 0034: nullable — un evento puede no tener un Location
    # vinculado y usar `location_text` (dirección libre, sin coordenadas).
    location_id: UUID | None = Field(default=None, foreign_key="locations.id", index=True)  # índice: 0033
    # Dirección como texto libre para cuando el lugar no está cargado y no
    # se puede marcar en el mapa. Mutuamente excluyente con location_id
    # (ver CheckConstraint arriba). No tiene coordenadas: el evento no
    # aparece en el mapa ni tiene ficha de lugar.
    location_text: str | None = Field(default=None, max_length=500)

    # Datos principales
    title: str = Field(max_length=255)
    description: str | None = Field(default=None)
    date: date
    time: time
    # Etapa 10a: obligatorio. Migración 0018 backfillea las filas viejas
    # (time_start + 2h, o 23:59 si eso cruza medianoche) antes del NOT NULL.
    time_end: time = Field()
    # Etapa 10b: fecha de fin — None = mismo día que `date` (retrocompatible,
    # todas las filas anteriores a esta etapa quedan con date_end=None). El
    # backend siempre lo trata como `date_end or date` (nunca None a mano);
    # ver EventRead.date_end (schemas/event.py) y is_event_currently_visible
    # (services/event_service.py).
    date_end: date | None = Field(default=None)
    # category (str único) y moment (str único) se migraron a las tablas
    # event_categories / event_moments en la Etapa 6.5 — ver category_links /
    # moment_links más abajo. moment ahora se calcula siempre desde
    # time/time_end con app.core.moment.calculate_moments().

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
    contact_facebook: str | None = Field(default=None, max_length=500)  # Etapa 12a
    contact_web: str | None = Field(default=None)
    contact_email: str | None = Field(default=None)

    # Media — Etapa "Diseño v3": vuelve a un único flyer (proporción 4:5,
    # 1080×1350, "como el feed de Instagram") — deprecа el flyer dual
    # desktop/mobile de la Etapa 12b. La migración que agrega esta columna
    # no copia ningún valor de los campos viejos (decisión de la usuaria:
    # todos los eventos existentes quedan con flyer_url=None, el organizador
    # tiene que resubir). Exclusivo del plan Destacado Plus para el
    # organizador; el admin puede subirlo sin importar el plan (ver
    # _check_flyer_permission_and_plan en event_service.py).
    flyer_url: str | None = Field(default=None)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    city: "City" = Relationship(back_populates="events")
    organizer: "User" = Relationship(back_populates="organized_events")
    location: "Location" = Relationship(back_populates="events")  # None si usa location_text
    category_links: list["EventCategory"] = Relationship(
        back_populates="event", sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    moment_links: list["EventMoment"] = Relationship(
        back_populates="event", sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

    @property
    def categories(self) -> list[str]:
        """Lista de categorías del evento — se serializa tal cual en EventRead."""
        return [link.category for link in self.category_links]
