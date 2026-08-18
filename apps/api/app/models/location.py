from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import Column, JSON
from sqlmodel import Field, Relationship, SQLModel


class Location(SQLModel, table=True):
    __tablename__ = "locations"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # Etapa 8e — mismo hueco que is_active (ver más abajo): Location no
    # tenía timestamp de creación, pero LocationGastroAdminRead lo necesita
    # para el panel admin. Agregado con default "ahora" — retrocompatible.
    name: str = Field(max_length=255)
    address: str = Field(max_length=500)
    city_id: UUID = Field(foreign_key="cities.id")
    latitude: float | None = Field(default=None)
    longitude: float | None = Field(default=None)

    # Etapa 7b — lugares precargados y mapa
    description: str | None = Field(default=None, max_length=1000)
    hours: str | None = Field(default=None, max_length=500)
    place_type: str | None = Field(default=None, max_length=50)  # texto libre, sugerido en el frontend
    is_verified: bool = Field(default=False)  # el admin verificó este lugar como oficial
    # True: lugar precargado por el admin, visible en el selector del
    # formulario de evento. False: creado automáticamente cuando un
    # organizador escribió una dirección libre — no aparece en el selector.
    is_public: bool = Field(default=False)

    # Etapa 8e — hueco encontrado al planificar: el pedido de gastronomía
    # necesita poder "deshabilitar" un lugar sin borrarlo (oculto de las
    # vistas públicas, sigue existiendo para el admin). No existía ningún
    # campo así para Location — se agrega acá, con default True para no
    # afectar los lugares de eventos ya cargados. Ver a_revisar.md.
    is_active: bool = Field(default=True)

    # ── Etapa 8e-pre — Gastronomía ───────────────────────────────────────

    is_gastro: bool = Field(default=False)
    # True = aparece en la sección Gastronomía. False = solo se usa como
    # ubicación de eventos. Un lugar puede ser ambas cosas a la vez.

    plan: str = Field(default="gratis")
    # Plan de visibilidad en la sección Gastronomía: "gratis" | "dest" | "pro".
    # Mismo sistema que Event.plan. Solo relevante si is_gastro=True.

    featured_until: datetime | None = Field(default=None)
    # Vencimiento del plan pago de gastronomía. None = sin fecha de
    # vencimiento (plan gratis, o plan activo sin fecha porque el admin lo
    # activó manualmente).

    # ── Horarios estructurados ───────────────────────────────────────────

    opening_hours: dict | None = Field(
        default=None, sa_column=Column(JSON, nullable=True)
    )
    # Horarios de apertura por día de la semana:
    # {"lunes": {"open": "09:00", "close": "22:00"}, ..., "domingo": null}
    # null en un día = cerrado ese día. El campo `hours` (texto libre) sigue
    # existiendo para notas complementarias como "Cerrado los feriados" o
    # "Solo con reserva" — no son redundantes.

    # ── Contacto del lugar ───────────────────────────────────────────────

    gastro_whatsapp: str | None = Field(default=None, max_length=50)
    gastro_instagram: str | None = Field(default=None, max_length=100)
    gastro_web: str | None = Field(default=None, max_length=500)
    gastro_email: str | None = Field(default=None, max_length=255)

    # ── Características ──────────────────────────────────────────────────

    has_delivery: bool = Field(default=False)
    has_reservations: bool = Field(default=False)

    price_range: str | None = Field(default=None, max_length=5)
    # "$" económico | "$$" precio medio | "$$$" premium | None no especificado

    # ── Imagen principal del lugar ───────────────────────────────────────

    cover_img_url: str | None = Field(default=None, max_length=500)
    # Foto del local (diferente al flyer de eventos). Mismo patrón de
    # almacenamiento que flyer_url: Supabase Storage en prod, ruta local en dev.

    city: "City" = Relationship(back_populates="locations")
    events: list["Event"] = Relationship(back_populates="location")
    gastro_types: list["LocationGastroType"] = Relationship(back_populates="location")
