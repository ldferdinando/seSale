import { format, toZonedTime } from "date-fns-tz";

import { ARGENTINA_TZ } from "@/lib/date-helpers";
import { WEEKDAYS, type OpeningHours, type Weekday } from "@/features/gastro/types";

/**
 * date-fns "EEEE" en locale por defecto (inglés) — mapeamos directo al
 * índice de getDay() en hora argentina para no depender de un locale.
 * getDay(): 0=domingo, 1=lunes, ..., 6=sábado.
 */
const DAY_INDEX_TO_WEEKDAY: Weekday[] = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

/** Día de la semana actual en Argentina (independiente de la zona horaria
 * del navegador). */
export function currentWeekdayInArgentina(now: Date = new Date()): Weekday {
  const zoned = toZonedTime(now, ARGENTINA_TZ);
  return DAY_INDEX_TO_WEEKDAY[zoned.getDay()];
}

/** "09:00 a 22:00 hs" o null si el día no tiene horario definido. */
export function formatDayHours(opening: OpeningHours | null, day: Weekday): string | null {
  if (!opening) return null;
  const hours = opening[day];
  if (!hours) return null;
  return `${hours.open} a ${hours.close} hs`;
}

/** "Hoy: 09:00 a 22:00 hs", o null si no hay dato para hoy — ya sea porque
 * `opening_hours` es null/vacío (nunca se cargó ningún horario) o porque el
 * día de hoy específico no tiene horario cargado (ej. el lugar cierra los
 * domingos). En ambos casos queda en silencio: no hay texto "Hoy: cerrado",
 * porque "no se cargó horario" no es lo mismo que "está cerrado ahora"
 * (ver isOpenNow() para ese caso, que sí es un dato real). */
export function formatTodayHours(opening: OpeningHours | null, now: Date = new Date()): string | null {
  if (!opening) return null;
  const today = currentWeekdayInArgentina(now);
  const hours = opening[today];
  return hours ? `Hoy: ${hours.open} a ${hours.close} hs` : null;
}

/**
 * ¿Hay al menos un día con horario cargado? `opening_hours` puede ser un
 * objeto no-null con los 7 días en `null` (el lugar se configuró —
 * eligió un tipo de gastronomía/espacio — pero no tildó ningún día en el
 * form admin, ver LocationForm.tsx) — hay que distinguir ese caso de
 * "tiene horario pero hoy está cerrado", porque "sin ningún día cargado"
 * nunca debe mostrar "Cerrado" (bug real reportado: la lista semanal
 * completa de la Ficha de Lugar mostraba "Cerrado" en los 7 días).
 */
export function hasAnyHoursLoaded(opening: OpeningHours | null): boolean {
  if (!opening) return false;
  return Object.values(opening).some((hours) => hours != null);
}

/**
 * Hora actual en Argentina, formato "HH:mm" — comparable lexicográficamente
 * contra `open`/`close` (mismo criterio que `localTimeToUtc`/etc. en
 * `date-helpers.ts`, siempre 2 dígitos).
 */
function currentTimeInArgentina(now: Date): string {
  return format(toZonedTime(now, ARGENTINA_TZ), "HH:mm", { timeZone: ARGENTINA_TZ });
}

/**
 * ¿Está abierto ahora mismo? `opening_hours` null (no se sabe el horario) o
 * el día actual sin horario cargado (cerrado hoy) → false. Contempla
 * horarios que cruzan medianoche (`close < open`, ej. 20:00 a 02:00): abierto
 * si la hora actual es >= open O < close.
 */
export function isOpenNow(opening: OpeningHours | null, now: Date = new Date()): boolean {
  if (!opening) return false;
  const today = currentWeekdayInArgentina(now);
  const hours = opening[today];
  if (!hours) return false;

  const current = currentTimeInArgentina(now);
  if (hours.close < hours.open) {
    // Cruza medianoche: abierto desde `open` hasta `close` del día siguiente.
    return current >= hours.open || current < hours.close;
  }
  return current >= hours.open && current < hours.close;
}

export { WEEKDAYS };
