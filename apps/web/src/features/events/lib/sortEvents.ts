import type { Event, EventPlan } from "@/features/events/types";

/** Rango de plan dentro de un mismo día: Plus → Destacado → Gratis. */
const PLAN_RANK: Record<EventPlan, number> = {
  pro: 0,
  dest: 1,
  gratis: 2,
};

/**
 * Orden de la agenda — mismo criterio que `ordenar()` en seSALE.html:
 * 1° fecha ascendente, 2° dentro del mismo día por plan (pro → dest →
 * gratis), 3° dentro del mismo plan por hora de inicio. Empates restantes
 * conservan el orden en que vinieron del backend (`Array.prototype.sort`
 * es estable). `date` (YYYY-MM-DD) y `time` (HH:MM[:SS]) se comparan como
 * strings: el formato de ancho fijo hace que el orden lexicográfico
 * coincida con el cronológico.
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
    if (a.time !== b.time) return a.time < b.time ? -1 : 1;
    return 0;
  });
}
