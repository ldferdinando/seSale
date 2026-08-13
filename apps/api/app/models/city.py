from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel


class City(SQLModel, table=True):
    __tablename__ = "cities"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(max_length=100)
    province: str = Field(max_length=100)
    emoji: str = Field(default="🏙️", max_length=10)
    is_active: bool = Field(default=False)
    sort_order: int = Field(default=99)
    latitude: float | None = Field(default=None)
    longitude: float | None = Field(default=None)

    events: list["Event"] = Relationship(back_populates="city")
    locations: list["Location"] = Relationship(back_populates="city")
    users: list["User"] = Relationship(back_populates="city")
    ad_slots: list["AdSlot"] = Relationship(back_populates="city")
