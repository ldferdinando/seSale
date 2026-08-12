from datetime import time

_DAY_START = time(7, 0)
_NIGHT_START = time(20, 0)


def _is_daytime(value: time) -> bool:
    return _DAY_START <= value < _NIGHT_START


def calculate_moments(time_start: time, time_end: time | None) -> list[str]:
    """Devuelve ['diurno' | 'nocturno'] (o ambos) según el rango horario del evento.

    DIURNO: alguna parte del evento cae entre 07:00 y 19:59.
    NOCTURNO: alguna parte del evento cae entre 20:00 y 06:59 (incluye medianoche).

    - Sin `time_end`: el momento se calcula solo desde `time_start`.
    - `time_end < time_start` indica que el evento cruza la medianoche.
    """
    if time_end is None:
        return ["diurno"] if _is_daytime(time_start) else ["nocturno"]

    moments: set[str] = set()

    if time_end < time_start:
        # Cruza medianoche: el tramo nocturno siempre está presente.
        moments.add("nocturno")
        if _is_daytime(time_start) or _is_daytime(time_end):
            moments.add("diurno")
    else:
        if time_start < _NIGHT_START and time_end > _DAY_START:
            moments.add("diurno")
        if time_start < _DAY_START or time_end > _NIGHT_START:
            moments.add("nocturno")
        if not moments:
            # Evento de duración cero exactamente en un borde (ej. 20:00-20:00).
            moments.add("diurno" if _is_daytime(time_start) else "nocturno")

    return sorted(moments, key=("diurno", "nocturno").index)
