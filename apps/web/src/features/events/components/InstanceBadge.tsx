import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Feature "Duplicar evento" — indicador "Instancia N" + link rápido a las
 * otras instancias del mismo grupo (eventos duplicados entre sí, ej.
 * distintas funciones de una obra o distintos días de un festival).
 *
 * Solo se usa en vistas de gestión (Mis eventos, panel admin) — NUNCA en la
 * vista pública (EventCard no lo renderiza, se muestra siempre al lado,
 * nunca adentro).
 *
 * El número de instancia no viene de la API: se calcula acá por orden de
 * `created_at` dentro del grupo — mismo criterio que el backend documenta
 * en `Event.instance_group_id` (services/event_service.py).
 */
export interface InstanceSibling {
  id: string;
  title: string;
  date: string;
  created_at: string;
}

interface InstanceBadgeProps {
  currentEventId: string;
  /** Todas las instancias del grupo, INCLUYENDO la actual. Si tiene menos
   * de 2 elementos no se renderiza nada (no es un evento duplicado, o el
   * resto del grupo todavía no cargó). */
  instances: InstanceSibling[];
  /** Resuelve el link de cada instancia hermana (no de la actual). */
  getHref: (eventId: string) => string;
}

export function InstanceBadge({ currentEventId, instances, getHref }: InstanceBadgeProps) {
  if (instances.length < 2) return null;

  const sorted = [...instances].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const number = sorted.findIndex((instance) => instance.id === currentEventId) + 1;
  const others = sorted.filter((instance) => instance.id !== currentEventId);

  return (
    <details className="relative inline-block">
      <summary className="cursor-pointer select-none rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-ink-3">
        Instancia {number}
      </summary>
      <ul className="absolute left-0 top-full z-10 mt-1 min-w-[200px] rounded-lg border border-border bg-card p-2 text-xs shadow-md">
        <li className="px-1 pb-1 font-semibold text-ink-4">Otras instancias</li>
        {others.map((instance) => (
          <li key={instance.id}>
            <a href={getHref(instance.id)} className="block rounded px-1 py-1 text-primary hover:underline">
              {instance.title} — {format(parseISO(instance.date), "d MMM yyyy", { locale: es })}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
