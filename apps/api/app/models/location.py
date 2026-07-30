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

    city: "City" = Relationship(back_populates="locations")
    events: list["Event"] = Relationship(back_populates="location")
