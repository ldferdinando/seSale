from pydantic import BaseModel


class StatsRead(BaseModel):
    total_events: int
    total_organizers: int
    total_cities: int
