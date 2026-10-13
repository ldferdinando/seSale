import type { Event, EventPlan } from "@/features/events/types";
import { utcTimeToLocal } from "@/lib/date-helpers";

/** Rango de plan dentro de un mismo día: Plus → Destacado → Gratis. */
const PLAN_RANK: Record<EventPlan, number> = {
  pro: 0,
  dest: 1,
  gratis: 2,
};

/**
 * Orden de la agenda — mismo criterio que `ordenar()` en seSALE.html:
 * 1° fecha ascendente, 2° dentro del mismo día por plan (pro → dest →
 * gratis), 3° dentro del mismo plan por hora de inicio EN HORA ARGENTINA.
 * Empates restantes conservan el orden en que vinieron del backend
 * (`Array.prototype.sort` es estable). `date` (YYYY-MM-DD, día de negocio
 * ART) y la hora local (HH:mm) se comparan como strings: el formato de
 * ancho fijo hace que el orden lexicográfico coincida con el cronológico.
 * `time` llega en UTC — compararlo crudo ponía un evento de las 22:00 ART
 * (01:00 UTC) antes que uno de las 20:00 ART (23:00 UTC) del mismo día.
 *
 * Único punto de ordenamiento del listado público — lo usan EventList
 * (Home, categoría detalle) y "Eventos en este lugar" (GastroDetailView).
 * No devuelve el mismo array: copia antes de ordenar.
 */
export function sortEventsForAgenda<T extends Pick<Event, "date" | "time" | "plan">>(events: readonly T[]): T[] {
  return [...events].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    const planDiff = (PLAN_RANK[a.plan] ?? 2) - (PLAN_RANK[b.plan] ?? 2);
    if (planDiff !== 0) return planDiff;
    const aTime = utcTimeToLocal(a.date, a.time.slice(0, 5));
    const bTime = utcTimeToLocal(b.date, b.time.slice(0, 5));
    if (aTime !== bTime) return aTime < bTime ? -1 : 1;
    return 0;
  });
}
