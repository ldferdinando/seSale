import { toZonedTime } from "date-fns-tz";

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

/** "Hoy: 09:00 a 22:00 hs" / "Hoy: cerrado" / null si opening_hours es null. */
export function formatTodayHours(opening: OpeningHours | null, now: Date = new Date()): string | null {
  if (!opening) return null;
  const today = currentWeekdayInArgentina(now);
  const hours = opening[today];
  return hours ? `Hoy: ${hours.open} a ${hours.close} hs` : "Hoy: cerrado";
}

export { WEEKDAYS };
