import type { EventMoment } from "@/features/events/types";

/** Día 07:00–19:59 hs · Noche 20:00–06:59 hs, como en seSALE.html. */
export function getEventMoment(time: string): EventMoment {
  const hour = Number(time.slice(0, 2));
  return hour >= 7 && hour < 20 ? "dia" : "noche";
}
