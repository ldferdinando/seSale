from uuid import UUID

from sqlmodel import Field, Relationship, SQLModel


class LocationGastroType(SQLModel, table=True):
    """Tipo gastronómico de un Location — tabla intermedia, igual patrón que
    EventCategory. Un lugar puede tener múltiples tipos (ej: bar + cerveceria).
    """

    __tablename__ = "location_gastro_types"

    location_id: UUID = Field(foreign_key="locations.id", primary_key=True)
    gastro_type: str = Field(primary_key=True, max_length=50)
    # String libre — validado en app.services.location_service
    # (_validate_gastro_types_active) contra gastro_types_catalog (Etapa
    # 12a). Hasta esa etapa se validaba contra la constante GASTRO_TYPES
    # hardcodeada que vivía acá; ahora el admin puede agregar tipos nuevos
    # sin cambio de código.

    location: "Location" = Relationship(back_populates="gastro_types")
