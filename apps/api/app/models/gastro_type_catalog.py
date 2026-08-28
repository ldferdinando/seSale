from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class GastroTypeCatalog(SQLModel, table=True):
    """Catálogo de tipos gastronómicos, gestionable por el admin (Etapa 12a).

    `key` es el mismo string que ya se guarda en
    `location_gastro_types.gastro_type` (tabla intermedia lugar↔tipo, sin
    cambios) — reemplaza la constante `GASTRO_TYPES` hardcodeada de
    `app/models/location_gastro_type.py` como fuente de verdad. Ver
    ARCHITECTURE.md.
    """

    __tablename__ = "gastro_types_catalog"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    key: str = Field(max_length=50, unique=True)

    name: str = Field(max_length=100)

    emoji: str | None = Field(default=None, max_length=10)

    sort_order: int = Field(default=99)

    is_active: bool = Field(default=True)
    # False = eliminación lógica: no aparece en el selector de tipos del ABM
    # de gastronomía, pero los lugares existentes con este tipo lo conservan.

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
