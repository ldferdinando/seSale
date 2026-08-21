import { format, fromZonedTime, toZonedTime } from "date-fns-tz";
import { addDays, format as formatDateOnly, isSameDay, parseISO } from "date-fns";

/** Zona horaria de Argentina — UTC-3, sin cambio de horario estacional. */
export const ARGENTINA_TZ = "America/Argentina/Buenos_Aires";

/**
 * Convierte una hora en UTC (string ISO) a formato 24hs ("HH:mm") en hora
 * argentina. El backend siempre almacena y devuelve horas en UTC — esta
 * conversión es solo de presentación, en el cliente.
 */
export function formatEventTime(isoString: string): string {
  const date = new Date(isoString);
  return format(toZonedTime(date, ARGENTINA_TZ), "HH:mm", { timeZone: ARGENTINA_TZ });
}

/**
 * Combina `date` ("YYYY-MM-DD") y `time` ("HH:mm:ss", ambos en UTC como los
 * devuelve la API) en un string ISO datetime UTC, listo para formatEventTime.
 */
export function toEventDateTimeISO(date: string, time: string): string {
  return `${date}T${time}Z`;
}

/**
 * Convierte una hora tipeada por el usuario en hora argentina ("HH:mm") a
 * UTC ("HH:mm"), lista para mandar a la API. `date` solo se usa como
 * referencia para el cálculo — la API guarda `date` sin convertir (es el
 * día de negocio en Argentina, no cambia por el corrimiento de horario).
 */
export function localTimeToUtc(date: string, localTime: string): string {
  const utcDate = fromZonedTime(`${date}T${localTime}`, ARGENTINA_TZ);
  return format(toZonedTime(utcDate, "UTC"), "HH:mm", { timeZone: "UTC" });
}

/**
 * Inverso de `localTimeToUtc`: convierte una hora en UTC (como la devuelve
 * la API) a hora argentina ("HH:mm"), para precargar el formulario de
 * edición.
 */
export function utcTimeToLocal(date: string, utcTime: string): string {
  const utcDate = new Date(`${date}T${utcTime}Z`);
  return format(toZonedTime(utcDate, ARGENTINA_TZ), "HH:mm", { timeZone: ARGENTINA_TZ });
}

/** Fecha de hoy en Argentina (no la fecha UTC del browser/servidor). */
export function argentinaTodayIso(): string {
  return format(toZonedTime(new Date(), ARGENTINA_TZ), "yyyy-MM-dd", { timeZone: ARGENTINA_TZ });
}

/**
 * Etapa 10c — rango de fecha/hora de un evento, en hora argentina, listo
 * para mostrar en `EventCard`/`EventDetailView`. `date`/`dateEnd` son
 * fechas "YYYY-MM-DD" (día de negocio, nunca se convierten — ver
 * ARCHITECTURE.md § Timezone); `timeStart`/`timeEnd` son horas UTC
 * ("HH:mm:ss") como las devuelve la API. Reutiliza `formatEventTime` +
 * `toEventDateTimeISO` — no duplica la conversión UTC → hora argentina.
 *
 * - `dateEnd` vacío (no debería pasar desde la Etapa 10b, el backend
 *   siempre lo completa con `date`; queda como fallback defensivo): solo
 *   la hora de inicio.
 * - `dateEnd === date`: "HH:mm – HH:mm".
 * - `dateEnd === date + 1 día`: "HH:mm – HH:mm +1" — el "+1" es texto
 *   plano acá; el estilo diferenciado (tamaño/color) se aplica en el
 *   componente, parseando el sufijo del string.
 * - `dateEnd` más de un día después: "HH:mm d/M – HH:mm d/M" (fechas
 *   cortas, sin nombre de día).
 */
export function formatEventDateRange(
  date: string,
  timeStart: string,
  dateEnd: string | null | undefined,
  timeEnd: string,
): string {
  const start = formatEventTime(toEventDateTimeISO(date, timeStart));

  if (!dateEnd) {
    return start;
  }

  const end = formatEventTime(toEventDateTimeISO(dateEnd, timeEnd));

  if (dateEnd === date) {
    return `${start} – ${end}`;
  }

  const startDate = parseISO(date);
  const endDate = parseISO(dateEnd);

  if (isSameDay(endDate, addDays(startDate, 1))) {
    return `${start} – ${end} +1`;
  }

  const startShort = formatDateOnly(startDate, "d/M");
  const endShort = formatDateOnly(endDate, "d/M");
  return `${start} ${startShort} – ${end} ${endShort}`;
}
