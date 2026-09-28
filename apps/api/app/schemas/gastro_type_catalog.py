from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.category_catalog import _normalize_key

GastroTypeGrupo = Literal["gastro", "espacios"]


class GastroTypeRead(BaseModel):
    """Tipo gastronómico, público — usado por los chips de filtro de /lugares
    y el ABM de gastronomía del admin. Solo tipos activos (GET /api/gastro-types)."""

    id: UUID
    key: str
    name: str
    emoji: str | None
    sort_order: int
    grupo: GastroTypeGrupo

    model_config = ConfigDict(from_attributes=True)


class GastroTypeAdminRead(GastroTypeRead):
    is_active: bool
    created_at: datetime


class GastroTypeCreate(BaseModel):
    key: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=100)
    emoji: str | None = Field(default=None, max_length=10)
    sort_order: int = 99
    grupo: GastroTypeGrupo = "gastro"

    @field_validator("key")
    @classmethod
    def validate_key(cls, value: str) -> str:
        return _normalize_key(value)


class GastroTypeUpdate(BaseModel):
    """Edita nombre/emoji/sort_order/grupo — nunca `key`. Sin campo `color`:
    los tipos gastronómicos no tienen color de acento en el diseño."""

    name: str = Field(min_length=1, max_length=100)
    emoji: str | None = Field(default=None, max_length=10)
    sort_order: int = 99
    grupo: GastroTypeGrupo = "gastro"
