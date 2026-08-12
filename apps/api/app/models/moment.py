from uuid import UUID

from sqlmodel import Field, Relationship, SQLModel


class EventMoment(SQLModel, table=True):
    """Momento del evento ("diurno" y/o "nocturno") — Etapa 6.5.

    Se recalcula con `app.core.moment.calculate_moments()` cada vez que se
    crea o edita un evento, a partir de `time`/`time_end`. No es un dato que
    el usuario elija: un evento con horario 18:00-22:00 tiene ambos
    registros ("diurno" y "nocturno") en esta tabla.
    """

    __tablename__ = "event_moments"

    event_id: UUID = Field(foreign_key="events.id", primary_key=True)
    moment: str = Field(primary_key=True, max_length=20)  # "diurno" | "nocturno"

    event: "Event" = Relationship(back_populates="moment_links")
