from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


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
