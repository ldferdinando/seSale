from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import Index, text
from sqlmodel import Field, Relationship, SQLModel, UniqueConstraint


class AdSlot(SQLModel, table=True):
    """Espacio publicitario — la posición fija en la página. Lo crea el
    sistema (seed, o automáticamente al activar una ciudad / crear una
    categoría — ver app/services/ad_service.py), no el admin: no cambia
    frecuentemente. El contenido (imágenes/links por anunciante) vive en
    AdItem."""

    __tablename__ = "ad_slots"
    __table_args__ = (
        # Cubre los slots con category_key no nulo (cada categoría es un
        # espacio propio, coexiste con el general de la misma section/position).
        UniqueConstraint(
            "city_id",
            "section",
            "slot_position",
            "category_key",
            name="uq_ad_slot_city_section_position_category",
        ),
        # El UniqueConstraint de arriba NO alcanza para bloquear dos filas con
        # category_key=NULL en la misma (city_id, section, slot_position): en
        # SQL estándar NULL nunca es igual a NULL, así que ni Postgres ni
        # SQLite lo detectarían como duplicado con un UniqueConstraint común
        # (Postgres 15+ tiene NULLS NOT DISTINCT, pero SQLite —usado en los
        # tests— no). Un índice único parcial cubre el caso NULL en ambos
        # motores (SQLite soporta índices parciales con WHERE).
        Index(
            "uq_ad_slot_city_section_position_null_category",
            "city_id",
            "section",
            "slot_position",
            unique=True,
            postgresql_where=text("category_key IS NULL"),
            sqlite_where=text("category_key IS NULL"),
        ),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    city_id: UUID = Field(foreign_key="cities.id", index=True)

    # Sección donde aparece este slot:
    # "eventos"        → home, banners wide arriba del listado de eventos
    # "eventos-grid"   → home, tiles cuadrados debajo del listado
    # "gastronomia"    → pantalla de gastronomía
    # "categoria-wide" → banners wide en /categorias (category_key=None) o en
    #                    /categorias/{key} (category_key=key) — Etapa 13b
    # "categoria-grid" → tiles cuadrados en /categorias/{key}, siempre con
    #                    category_key — Etapa 13b
    section: str = Field(max_length=20)

    # Posición dentro de la sección (0-based). "eventos"/"gastronomia": 0-2
    # (los 3 carruseles wide). "eventos-grid"/"categoria-wide"/"categoria-grid":
    # 0, 1... sin límite (categoria-wide usa 0-1, ver seed.py/ad_service.py).
    slot_position: int = Field(default=0)

    # Solo relevante cuando section="categoria-wide" o "categoria-grid".
    # None = aparece en TODAS las categorías (banner general de la sección
    #        /categorias). "musica"/"teatro"/etc. = solo en /categorias/{key}.
    # Para cualquier otro section, siempre None (validado en
    # schemas/ad_slot.py::AdSlotCreate).
    category_key: str | None = Field(default=None, max_length=50)

    # "sequential" (carruseles eventos/gastronomia/categoria-wide) | "random" (grid)
    rotation_mode: str = Field(default="sequential", max_length=20)

    rotation_interval_seconds: int = Field(default=3)

    is_active: bool = Field(default=True)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relaciones
    city: "City" = Relationship(back_populates="ad_slots")
    items: list["AdItem"] = Relationship(back_populates="slot")
