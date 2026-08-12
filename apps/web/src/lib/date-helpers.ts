import { format, toZonedTime } from "date-fns-tz";

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
