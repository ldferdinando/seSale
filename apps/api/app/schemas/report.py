from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ReportCreate(BaseModel):
    text: str = Field(min_length=10, max_length=1000)
    contact_phone: str = Field(min_length=1, max_length=50)

    @field_validator("contact_phone")
    @classmethod
    def validate_contact_phone(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("El teléfono de contacto es obligatorio")
        return value.strip()


class ReportRead(BaseModel):
    id: UUID
    event_id: UUID
    text: str
    contact_phone: str
    created_at: datetime
    status: str

    model_config = ConfigDict(from_attributes=True)


class AdminReportRead(ReportRead):
    event_title: str


class ReportStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in ("pending", "reviewed", "dismissed"):
            raise ValueError("status debe ser pending, reviewed o dismissed")
        return value


class AdminReportListParams(BaseModel):
    status: str | None = None
    event_id: UUID | None = None
    date_from: date | None = None
    date_to: date | None = None
