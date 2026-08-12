from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class Report(SQLModel, table=True):
    """Reporte de un evento hecho por un usuario sin login (Etapa 6.5)."""

    __tablename__ = "reports"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    event_id: UUID = Field(foreign_key="events.id", index=True)
    text: str = Field(max_length=1000)
    contact_phone: str = Field(max_length=50)
    ip_address: str | None = Field(default=None, max_length=45)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # Para validación futura del teléfono (no implementada todavía).
    phone_verified: bool = Field(default=False)
    status: str = Field(default="pending")  # "pending" | "reviewed" | "dismissed"
