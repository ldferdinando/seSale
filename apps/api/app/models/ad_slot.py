from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel


class AdSlot(SQLModel, table=True):
    __tablename__ = "ad_slots"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    slot_key: str = Field(max_length=50)
    city_id: UUID = Field(foreign_key="cities.id")
    advertiser_name: str | None = Field(default=None)
    img_url: str | None = Field(default=None)
    link_url: str | None = Field(default=None)
    alt_text: str | None = Field(default=None)
    is_active: bool = Field(default=False)
    sort_order: int = Field(default=0)

    city: "City" = Relationship(back_populates="ad_slots")
