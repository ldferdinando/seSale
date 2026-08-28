import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

_KEY_RE = re.compile(r"^[a-z0-9_-]+$")


def _normalize_key(value: str) -> str:
    """No permite espacios ni mayúsculas — pedido explícito de la Etapa 12a
    (Parte 8b dice "reemplazar espacios por guión" del lado del frontend;
    acá el backend rechaza directamente cualquier valor que no cumpla el
    formato, sea o no que el frontend ya lo haya normalizado)."""
    if not _KEY_RE.match(value):
        raise ValueError("key solo puede tener minúsculas, números, guiones y guiones bajos, sin espacios")
    return value


class CategoryRead(BaseModel):
    """Categoría de evento, pública — usada por el selector del formulario y
    los filtros del home. Solo categorías activas (GET /api/categories)."""

    id: UUID
    key: str
    name: str
    emoji: str | None
    color: str | None
    sort_order: int

    model_config = ConfigDict(from_attributes=True)


class CategoryAdminRead(CategoryRead):
    """Extiende CategoryRead con los campos de administración."""

    is_active: bool
    created_at: datetime


class CategoryCreate(BaseModel):
    key: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=100)
    emoji: str | None = Field(default=None, max_length=10)
    color: str | None = Field(default=None, max_length=20)
    sort_order: int = 99

    @field_validator("key")
    @classmethod
    def validate_key(cls, value: str) -> str:
        return _normalize_key(value)


class CategoryUpdate(BaseModel):
    """Edita nombre/emoji/color/sort_order — nunca `key` (es el identificador
    que ya está en event_categories.category de eventos existentes)."""

    name: str = Field(min_length=1, max_length=100)
    emoji: str | None = Field(default=None, max_length=10)
    color: str | None = Field(default=None, max_length=20)
    sort_order: int = 99
