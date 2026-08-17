from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

AdSection = Literal["eventos", "eventos-grid", "gastronomia"]
AdRotationMode = Literal["sequential", "random"]
AdItemStatus = Literal["active", "paused", "expired"]


class AdItemPublicRead(BaseModel):
    """Lo que ve el público — sin datos del anunciante."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    img_url: str
    link_url: str | None
    alt_text: str | None
    display_order: int


class AdSlotRead(BaseModel):
    """El espacio publicitario con sus AdItem vigentes (o todos, para el
    admin — ver AdSlotAdminRead más abajo) anidados."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    city_id: UUID
    section: AdSection
    slot_position: int
    rotation_mode: AdRotationMode
    rotation_interval_seconds: int
    is_active: bool
    items: list[AdItemPublicRead]


class AdItemAdminRead(AdItemPublicRead):
    """Lo que ve el admin — agrega datos del anunciante y vigencia."""

    advertiser_name: str | None
    user_id: UUID
    user_public_name: str
    starts_at: date
    ends_at: date | None
    status: AdItemStatus
    created_by: UUID
    created_at: datetime


class AdSlotAdminRead(AdSlotRead):
    """Igual a AdSlotRead pero con TODOS los AdItem (activos, pausados,
    vencidos) — el admin necesita ver el historial completo del slot."""

    items: list[AdItemAdminRead]  # type: ignore[assignment]


class AdItemCreate(BaseModel):
    slot_id: UUID
    user_id: UUID
    img_url: str = Field(min_length=1, max_length=500)
    link_url: str | None = Field(default=None, max_length=500)
    alt_text: str | None = Field(default=None, max_length=255)
    advertiser_name: str | None = Field(default=None, max_length=255)
    starts_at: date | None = None  # default: hoy, se resuelve en el servicio
    ends_at: date | None = None
    display_order: int = 0

    @model_validator(mode="after")
    def _validate_dates(self) -> "AdItemCreate":
        if self.starts_at is not None and self.ends_at is not None and self.starts_at > self.ends_at:
            raise ValueError("La fecha de inicio no puede ser posterior a la fecha de fin")
        return self


class AdItemUpdate(BaseModel):
    """Todos los campos opcionales. slot_id y user_id no se pueden cambiar
    después de creado — no están acá a propósito."""

    img_url: str | None = Field(default=None, min_length=1, max_length=500)
    link_url: str | None = Field(default=None, max_length=500)
    alt_text: str | None = Field(default=None, max_length=255)
    advertiser_name: str | None = Field(default=None, max_length=255)
    starts_at: date | None = None
    ends_at: date | None = None
    display_order: int | None = None
    status: AdItemStatus | None = None

    @model_validator(mode="after")
    def _validate_dates(self) -> "AdItemUpdate":
        if self.starts_at is not None and self.ends_at is not None and self.starts_at > self.ends_at:
            raise ValueError("La fecha de inicio no puede ser posterior a la fecha de fin")
        return self


class AdItemStatusUpdate(BaseModel):
    """PATCH /ad-items/{id}/status — solo alterna active/paused, nunca expired.

    A propósito NO es un Literal["active","paused"]: un valor fuera de ese
    par (ej. "expired") debe responder 400 (regla de negocio, "no se puede
    usar para marcar como expired"), no 422 de validación de schema."""

    status: str


class AdItemReorderRequest(BaseModel):
    slot_id: UUID
    ordered_ids: list[UUID]


class AdItemWithSlotRead(AdItemAdminRead):
    """AdItemAdminRead + la sección/posición de su AdSlot — usado únicamente
    por GET /api/users/me/banners, donde el usuario necesita saber DÓNDE
    aparece su banner (AdItemAdminRead solo, sin esto, no lo dice)."""

    section: AdSection
    slot_position: int
