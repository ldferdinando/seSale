"""Helpers de timezone para Argentina (UTC-3, sin horario de verano).

El resto de la app almacena `date`/`date_end` como el día de negocio en Argentina
(no se convierte) y `time`/`time_end` en UTC. Estos helpers evitan
hardcodear el offset y centralizan la conversión.
"""

from datetime import date, datetime, time, timedelta
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


# Criterio único "¿a qué día pertenece un evento?" — ver a_revisar.md,
# sección "Fix producción — evento nocturno en el día equivocado".
#
# `Event.date`/`Event.date_end` son SIEMPRE el día de negocio en Argentina
# (lo que eligió la persona en el calendario), mientras que `time`/
# `time_end` son horas UTC. Nunca combinar `date` + `time` directo como si
# fueran del mismo huso: para ART >= 21:00 la hora UTC ya es del día
# siguiente. Estos helpers arman el instante real (aware, en hora
# Argentina) a partir de ese par mixto.


def event_local_datetime(business_day: date, utc_time: time) -> datetime:
    """Instante (aware, ART) de `business_day` (día ART) a la hora `utc_time`.

    Ej.: (sábado 17/10, 01:00 UTC) -> sábado 17/10 22:00 ART. Argentina no
    tiene DST, así que la hora local no depende del día de referencia.
    """
    local_time = utc_time_to_argentina(business_day, utc_time)
    return datetime.combine(business_day, local_time, tzinfo=ARGENTINA_TZ)


def event_end_datetime(event_date: date, date_end: date | None, time_end: time | None) -> datetime:
    """Instante (aware, ART) en que termina un evento.

    - `date_end=None` -> mismo día que `event_date`.
    - `time_end=None` (hora de fin opcional) -> fin del día de negocio de
      `date_end`: el evento se considera vigente hasta las 00:00 ART del
      día siguiente.
    """
    effective_date_end = date_end or event_date
    if time_end is None:
        return datetime.combine(effective_date_end + timedelta(days=1), time(0, 0), tzinfo=ARGENTINA_TZ)
    return event_local_datetime(effective_date_end, time_end)


# Hora UTC a la que empieza el día en Argentina (03:00 UTC = 00:00 ART).
# Las horas UTC menores a esta corresponden a la noche (21:00–23:59 ART)
# del mismo día de negocio — se usa para ordenar por hora local en SQL.
ARGENTINA_DAY_START_UTC: time = (
    datetime.combine(date(2000, 1, 1), time(0, 0), tzinfo=ARGENTINA_TZ).astimezone(_UTC).time()
)
