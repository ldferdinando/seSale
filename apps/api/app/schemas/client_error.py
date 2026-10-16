from pydantic import BaseModel, Field


class ClientErrorCreate(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    stack: str | None = Field(default=None, max_length=8000)
    url: str = Field(min_length=1, max_length=2000)
    user_agent: str = Field(min_length=1, max_length=500)
    source: str = Field(default="unknown", max_length=50)
