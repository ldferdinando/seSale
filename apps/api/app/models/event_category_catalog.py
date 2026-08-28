from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class EventCategoryCatalog(SQLModel, table=True):
    """Catálogo de categorías de eventos, gestionable por el admin (Etapa 12a).

    `key` es el mismo string que ya se guarda en `event_categories.category`
    (tabla intermedia evento↔categoría, sin cambios) — esta tabla no
    reemplaza esa relación, solo agrega metadata editable (nombre visible,
    emoji, color, orden, activo/inactivo) sobre los mismos keys que ya
    existían hardcodeados en el código. Ver ARCHITECTURE.md.
    """

    __tablename__ = "event_categories_catalog"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    key: str = Field(max_length=50, unique=True)
    # Identificador único usado en el código y en la DB (event_categories.category).
    # No cambia aunque el admin edite el nombre — ver CategoryUpdate (schemas).

    name: str = Field(max_length=100)
    # Nombre visible en la UI — el admin puede editarlo.

    emoji: str | None = Field(default=None, max_length=10)

    color: str | None = Field(default=None, max_length=20)
    # Color de acento (hex o CSS var) usado en EventCard para el estilo de la categoría.

    sort_order: int = Field(default=99)

    is_active: bool = Field(default=True)
    # False = eliminación lógica: no aparece en el selector del formulario,
    # pero los eventos existentes con esta categoría la conservan.

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
