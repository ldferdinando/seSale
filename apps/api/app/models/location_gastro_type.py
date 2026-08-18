from uuid import UUID

from sqlmodel import Field, Relationship, SQLModel

# Tipos válidos por ahora — string constants para usar en validaciones.
# Cuando el admin pueda cargar tipos nuevos (etapa futura), esta lista se
# reemplaza por una tabla maestra (ver a_revisar.md, Etapa 8e-pre).
GASTRO_TYPES = [
    "cerveceria",
    "restaurante",
    "parrilla",
    "bar",
    "cafe",
    "pizzeria",
    "heladeria",
    "rotiseria",
    "vinoteca",
    "otro",
]


class LocationGastroType(SQLModel, table=True):
    """Tipo gastronómico de un Location — tabla intermedia, igual patrón que
    EventCategory. Un lugar puede tener múltiples tipos (ej: bar + cerveceria).
    """

    __tablename__ = "location_gastro_types"

    location_id: UUID = Field(foreign_key="locations.id", primary_key=True)
    gastro_type: str = Field(primary_key=True, max_length=50)
    # String libre validado en el schema Pydantic contra GASTRO_TYPES (la
    # lista de arriba). Cuando el admin pueda cargar tipos nuevos (etapa
    # futura), este campo acepta cualquier string sin cambio de modelo.

    location: "Location" = Relationship(back_populates="gastro_types")
