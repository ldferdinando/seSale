"""Helpers de timezone para Argentina (UTC-3, sin horario de verano).

El resto de la app almacena `date` como el día de negocio en Argentina
(no se convierte) y `time`/`time_end` en UTC. Estos helpers evitan
hardcodear el offset y centralizan la conversión.
"""

from datetime import date, datetime, time
from zoneinfo import ZoneInfo

ARGENTINA_TZ = ZoneInfo("America/Argentina/Buenos_Aires")
_UTC = ZoneInfo("UTC")


def argentina_now() -> datetime:
    """Momento actual, aware, en hora Argentina."""
    return datetime.now(ARGENTINA_TZ)


def argentina_today() -> date:
    """Fecha de hoy en Argentina (no la fecha UTC del servidor)."""
    return argentina_now().date()


def utc_time_to_argentina(event_date: date, value: time) -> time:
    """Convierte una hora almacenada en UTC a hora Argentina.

    `event_date` solo se usa como referencia para armar el datetime a
    convertir — no afecta el resultado ya que Argentina no tiene DST.
    """
    utc_dt = datetime.combine(event_date, value, tzinfo=_UTC)
    return utc_dt.astimezone(ARGENTINA_TZ).time()
