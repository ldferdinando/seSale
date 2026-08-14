from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel


class Location(SQLModel, table=True):
    __tablename__ = "locations"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(max_length=255)
    address: str = Field(max_length=500)
    city_id: UUID = Field(foreign_key="cities.id")
    latitude: float | None = Field(default=None)
    longitude: float | None = Field(default=None)

    # Etapa 7b — lugares precargados y mapa
    description: str | None = Field(default=None, max_length=1000)
    hours: str | None = Field(default=None, max_length=500)
    place_type: str | None = Field(default=None, max_length=50)  # texto libre, sugerido en el frontend
    is_verified: bool = Field(default=False)  # el admin verificó este lugar como oficial
    # True: lugar precargado por el admin, visible en el selector del
    # formulario de evento. False: creado automáticamente cuando un
    # organizador escribió una dirección libre — no aparece en el selector.
    is_public: bool = Field(default=False)

    city: "City" = Relationship(back_populates="locations")
    events: list["Event"] = Relationship(back_populates="location")
