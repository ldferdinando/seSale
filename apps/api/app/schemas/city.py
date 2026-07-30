from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    province: str
    emoji: str
    is_active: bool
    sort_order: int
