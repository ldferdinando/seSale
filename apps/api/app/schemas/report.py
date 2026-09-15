from datetime import date, datetime
from typing import Literal
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
    # Etapa "Ficha de Lugar v2.2": exactamente uno de los dos viene seteado
    # (event_id para /api/events/{id}/report, location_id para
    # /api/gastro/{id}/report) — ver app/models/report.py.
    event_id: UUID | None
    location_id: UUID | None
    text: str
    contact_phone: str
    created_at: datetime
    status: str

    model_config = ConfigDict(from_attributes=True)


class AdminReportRead(ReportRead):
    # Etapa "Admin de reportes de lugares": generalizado de `event_title` a
    # target_title/target_type para cubrir reportes de evento y de lugar con
    # el mismo campo (se eligió esto en vez de sumar `location_name` aparte
    # porque el frontend admin solo necesita un título + saber a qué tipo de
    # ficha linkear, no ambos títulos a la vez).
    target_title: str
    target_type: Literal["event", "location"]


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
