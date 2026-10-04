import type { Plan } from "@/features/plans/types";

/** Precio de un plan para mostrar en "Elegí visibilidad" (EventPlanChooser).
 *
 * Solo el plan `gratis` dice "Gratis". Un plan pago (dest/pro) sin precio
 * vigente o con precio en $0 — los placeholders que inserta la migración
 * 0017 en una base nueva, hasta que se carguen los reales — antes caía
 * también en "Gratis"; ahora muestra "Consultar precio". Ver a_revisar.md,
 * "Fix: flujo de pago por transferencia". */
export function formatPlanPrice(plan: Plan): string {
  if (plan.plan_type === "gratis") return "Gratis";
  if (!plan.price || plan.price.amount <= 0) return "Consultar precio";
  return `$${new Intl.NumberFormat("es-AR").format(plan.price.amount)}/mes`;
}
