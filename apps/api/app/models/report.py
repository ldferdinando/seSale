from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class Report(SQLModel, table=True):
    """Reporte hecho por un usuario sin login (Etapa 6.5: eventos).

    Etapa "Ficha de Lugar v2.2" — generalizado para poder reportar también un
    lugar gastronómico: `event_id` pasa a ser opcional y se suma `location_id`
    (igual de opcional). Exactamente uno de los dos está seteado en cada fila
    — se valida en `report_service.create_report`/`create_location_report`,
    no con un CHECK constraint (SQLite en tests no lo aplica igual que
    Postgres, y el servicio ya es el único punto de creación)."""

    __tablename__ = "reports"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    event_id: UUID | None = Field(default=None, foreign_key="events.id", index=True)
    location_id: UUID | None = Field(default=None, foreign_key="locations.id", index=True)
    text: str = Field(max_length=1000)
    contact_phone: str = Field(max_length=50)
    ip_address: str | None = Field(default=None, max_length=45)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # Para validación futura del teléfono (no implementada todavía).
    phone_verified: bool = Field(default=False)
    status: str = Field(default="pending")  # "pending" | "reviewed" | "dismissed"
