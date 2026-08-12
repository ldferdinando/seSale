from uuid import UUID

from sqlmodel import Field, Relationship, SQLModel


class EventCategory(SQLModel, table=True):
    """Categoría de un evento — relación many-to-many vía tabla intermedia (Etapa 6.5).

    Un evento puede tener entre 1 y 3 categorías (validado en
    `app.schemas.event`). Los valores válidos son los mismos definidos en
    `VALID_CATEGORIES` (app/schemas/event.py) y en ARCHITECTURE.md — se
    guardan como string, sin tabla de catálogo aparte.
    """

    __tablename__ = "event_categories"

    event_id: UUID = Field(foreign_key="events.id", primary_key=True)
    category: str = Field(primary_key=True, max_length=50)

    event: "Event" = Relationship(back_populates="category_links")
