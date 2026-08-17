from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel, UniqueConstraint


class AdSlot(SQLModel, table=True):
    """Espacio publicitario — la posición fija en la página. Lo crea el
    sistema (seed), no el admin: no cambia frecuentemente. El contenido
    (imágenes/links por anunciante) vive en AdItem."""

    __tablename__ = "ad_slots"
    __table_args__ = (
        UniqueConstraint(
            "city_id", "section", "slot_position", name="uq_ad_slots_city_section_position"
        ),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    city_id: UUID = Field(foreign_key="cities.id", index=True)

    # Sección donde aparece este slot:
    # "eventos"      → home, banners wide arriba del listado de eventos
    # "eventos-grid" → home, tiles cuadrados debajo del listado
    # "gastronomia"  → pantalla de gastronomía
    section: str = Field(max_length=20)

    # Posición dentro de la sección (0-based). "eventos"/"gastronomia": 0-2
    # (los 3 carruseles wide). "eventos-grid": 0, 1, 2... sin límite.
    slot_position: int = Field(default=0)

    # "sequential" (carruseles eventos/gastronomia) | "random" (grid)
    rotation_mode: str = Field(default="sequential", max_length=20)

    rotation_interval_seconds: int = Field(default=3)

    is_active: bool = Field(default=True)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relaciones
    city: "City" = Relationship(back_populates="ad_slots")
    items: list["AdItem"] = Relationship(back_populates="slot")
