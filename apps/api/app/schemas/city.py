from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CityCreate(BaseModel):
    """POST /api/admin/cities. `sort_order` es opcional: si no se manda, el
    service le asigna el máximo actual + 1 (la ciudad nueva aparece al final
    del listado). La ciudad nace con `is_active=True` (el admin la crea a
    propósito para usarla de inmediato)."""

    name: str = Field(min_length=1, max_length=100)
    province: str = Field(min_length=1, max_length=100)
    emoji: str = Field(default="🏙️", max_length=10)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    sort_order: int | None = Field(default=None, ge=0)


class CityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    province: str
    emoji: str
    is_active: bool
    sort_order: int
    latitude: float | None
    longitude: float | None


class CityAdminRead(CityRead):
    """Etapa 8a — usado por GET /api/admin/cities. `active_events_count`:
    eventos aprobados, activos y con fecha futura, para dar contexto al
    admin antes de deshabilitar la ciudad."""

    active_events_count: int


class CitySortOrderUpdate(BaseModel):
    sort_order: int = Field(ge=0)
