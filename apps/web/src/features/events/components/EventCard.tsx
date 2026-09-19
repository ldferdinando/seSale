import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, Crown, Image as ImageIcon, MapPin, Star } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCategoryCatalog } from "@/features/events/hooks/useCategoryCatalog";
import { CATEGORY_STYLES, DEFAULT_CATEGORY_STYLE } from "@/features/events/lib/categoryStyles";
import { EVENT_CATEGORIES, type Event } from "@/features/events/types";
import { resolveMediaUrl } from "@/lib/media";
import { formatEventDateRange } from "@/lib/date-helpers";
import { cn } from "@/lib/utils";

const VISIBLE_CATEGORY_BADGES = 2;

/**
 * Badges de categoría del evento: las primeras 2, con "+N" si hay más.
 * Etapa 10b-1: ya no se renderiza dentro de `EventCard` (seSALE.html no
 * muestra badges debajo del nombre en la fila, solo `.etipo` arriba) — se
 * deja exportado por si se necesita en otro lado.
 */
export function CategoryBadges({ categories }: { categories: string[] }) {
  const visible = categories.slice(0, VISIBLE_CATEGORY_BADGES);
  const remaining = categories.length - visible.length;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((category) => {
        const style = CATEGORY_STYLES[category] ?? DEFAULT_CATEGORY_STYLE;
        const label = EVENT_CATEGORIES.find((c) => c.value === category)?.label ?? category;
        return (
          <span
            key={category}
            className="rounded-full px-2 py-0.5 text-[9px] font-bold text-white"
            style={{ backgroundColor: style.color }}
          >
            {label}
          </span>
        );
      })}
      {remaining > 0 && (
        <span className="rounded-full bg-surface-5 px-2 py-0.5 text-[9px] font-bold text-ink-4">+{remaining}</span>
      )}
    </div>
  );
}

/**
 * Badge de plan (texto "Destacado"/"Destacado Plus").
 * Etapa 10b-1: seSALE.html elimina esta etiqueta de texto en las cards
 * públicas — el nivel de plan ahora se distingue solo por fondo/borde/
 * miniatura (ver `planCardClasses` más abajo). Se mantiene el componente
 * porque lo siguen usando `AdminFeaturedPanel.tsx`/`AdminEventsPanel.tsx`
 * (listados internos de admin, fuera del alcance de esta etapa).
 */
export function PlanBadge({ plan }: { plan: Event["plan"] }) {
  if (plan === "pro") {
    return (
      <Badge variant="pro" className="flex-shrink-0 gap-1">
        <Crown className="h-3 w-3" aria-hidden />
        Destacado Plus
      </Badge>
    );
  }
  if (plan === "dest") {
    return (
      <Badge variant="default" className="flex-shrink-0 gap-1">
        <Star className="h-3 w-3" aria-hidden />
        Destacado
      </Badge>
    );
  }
  return null;
}

/**
 * Jerarquía visual de plan para gratis/dest, calcada de seSALE.html
 * (`.evi`/`.evi-dest`) — Destacado Plus (`.evi-plus`) ya no comparte este
 * criterio de fondo/borde: desde la Etapa "Diseño v3" es una card de imagen
 * completa con su propio armado, ver el branch `isPro` en `EventCard` más
 * abajo.
 * - gratis: SIN recuadro — `.evi` en la referencia no tiene fondo ni borde
 *   propios (es una fila plana dentro de la lista, solo separada por
 *   `border-bottom`). Se pisan el `border`/`bg-card` que trae `Card` por
 *   default (Etapa "Ajustes de diseño reportados" — antes gratis quedaba
 *   con el recuadro completo del componente base, distinto de la
 *   referencia).
 * - dest: fondo degradé sutil + borde completo 1.5px en rosa.
 * Ningún nivel lleva etiqueta de texto — la diferencia es 100% visual.
 */
function planCardClasses(plan: Event["plan"]): string {
  if (plan === "dest") {
    // Fondo pasa de rosa a lime en seSALE_v2.html; el borde (#E91E8C77) no
    // cambia (no está en el alcance de esta etapa).
    return "border-[1.5px] border-[#E91E8C77] bg-[linear-gradient(135deg,#D4D94A26,#D4D94A0d)]";
  }
  return "border-transparent bg-transparent";
}

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const eventDate = parseISO(event.date);
  const category = event.categories[0];
  const { categories } = useCategoryCatalog();
  const style = CATEGORY_STYLES[category] ?? DEFAULT_CATEGORY_STYLE;
  const categoryLabel = categories.find((c) => c.key === category)?.name ?? category;
  const isPro = event.plan === "pro";

  // Etapa 10c: rango completo (fin en otro día que el inicio, ej. fiestas
  // 22:00→03:00) — formatEventDateRange ya devuelve el sufijo " +1" como
  // texto plano; acá se separa para darle el estilo chico/secundario.
  const dateRange = formatEventDateRange(event.date, event.time, event.date_end, event.time_end);
  const showsNextDaySuffix = dateRange.endsWith(" +1");
  const dateRangeMain = showsNextDaySuffix ? dateRange.slice(0, -" +1".length) : dateRange;

  const inactiveBadge = !event.is_active && (
    <span
      data-testid="event-inactive-badge"
      className="flex-shrink-0 rounded-full bg-surface-5 px-2 py-0.5 text-[9px] font-bold text-ink-3"
    >
      Dado de baja
    </span>
  );

  // Etapa "Diseño v3" — Destacado Plus (.evi-plus en seSALE_v3.html): card
  // de imagen completa (el flyer de fondo, 4:5) con los datos del evento
  // solapados en un panel translúcido abajo, en vez de la fila con
  // miniatura 44×44 que tenía antes. Ya no comparte layout con
  // gratis/dest — ver planCardClasses más arriba.
  if (isPro) {
    const flyerUrl = resolveMediaUrl(event.flyer_url);
    return (
      <Link href={`/eventos/${event.id}`} data-testid="event-card-link">
        <Card
          data-testid="event-card"
          className={cn(
            "relative aspect-[1080/1350] overflow-hidden rounded-2xl border-2 border-brand-pink p-0 transition-colors",
            !event.is_active && "opacity-50",
          )}
        >
          <CardContent className="relative h-full w-full p-0">
            {flyerUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={flyerUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="sesale-evi-plus-bg absolute inset-0 flex items-center justify-center">
                <ImageIcon className="h-12 w-12 text-ink-5" aria-hidden />
              </div>
            )}
            <div className="sesale-plus-scrim absolute inset-0" aria-hidden />
            <div className="sesale-plus-panel absolute inset-x-2.5 bottom-2.5 flex items-start gap-3.5 rounded-xl p-3.5">
              <div className="flex min-w-[40px] flex-col items-center text-center">
                <span className="text-[26px] font-extrabold leading-none tracking-tight text-white">
                  {format(eventDate, "d")}
                </span>
                <span className="mt-1 text-xs font-extrabold uppercase tracking-wider text-[#ff5c9b]">
                  {format(eventDate, "MMM", { locale: es })}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                {categoryLabel && (
                  <p
                    className="truncate text-xs font-extrabold uppercase tracking-[0.6px]"
                    style={{ color: style.color }}
                  >
                    {categoryLabel}
                  </p>
                )}
                <p
                  className="flex min-w-0 items-center gap-1.5 truncate text-[17px] font-extrabold text-white"
                  style={{ textShadow: "0 2px 10px rgba(0,0,0,.6)" }}
                >
                  <span className="truncate">{event.title}</span>
                  {inactiveBadge}
                </p>
                <p className="mt-1 flex items-center gap-2 truncate text-sm text-[#e8e8e8]">
                  <span
                    data-testid="event-card-hour"
                    className="flex flex-shrink-0 items-center gap-1 font-bold text-[#ff6fa5]"
                  >
                    <Clock className="h-3 w-3" aria-hidden />
                    {dateRangeMain}
                    {showsNextDaySuffix && <span className="text-[10px] font-normal opacity-80"> +1</span>}
                    {" hs"}
                  </span>
                  <span className="flex min-w-0 items-center gap-1 truncate">
                    <MapPin className="h-3 w-3 flex-shrink-0 text-[#ff6fa5]" aria-hidden />
                    <span className="truncate">{event.location.name}</span>
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/eventos/${event.id}`} data-testid="event-card-link">
      <Card
        data-testid="event-card"
        className={cn(
          "overflow-hidden transition-colors hover:border-primary/40",
          planCardClasses(event.plan),
          // Etapa 10b-2: eventos dados de baja por el organizador — solo
          // pueden llegar acá vía /mis-eventos (el listado público ya los
          // filtra), atenuados para que se note que no están visibles.
          !event.is_active && "opacity-50",
        )}
      >
        <CardContent className={cn("flex items-start gap-3.5", event.plan === "dest" ? "p-3.5" : "p-3")}>
          <div className="flex min-w-[40px] flex-col items-center text-center">
            <span
              className={cn(
                "font-extrabold leading-none tracking-tight text-primary",
                event.plan === "dest" ? "text-[26px]" : "text-lg",
              )}
            >
              {format(eventDate, "d")}
            </span>
            <span className="mt-1 text-xs font-extrabold uppercase tracking-wider text-ink-3">
              {format(eventDate, "MMM", { locale: es })}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            {categoryLabel && (
              <p
                className="truncate text-xs font-extrabold uppercase tracking-[0.6px]"
                style={{ color: style.color }}
              >
                {categoryLabel}
              </p>
            )}
            <p
              className={cn(
                "flex min-w-0 items-center gap-1.5 truncate text-foreground",
                event.plan === "dest" ? "text-[17px] font-extrabold" : "text-base font-bold",
              )}
            >
              <span className="truncate">{event.title}</span>
              {inactiveBadge}
            </p>
            <p className="mt-1 flex items-center gap-2 truncate text-sm text-ink-4">
              {/* Etapa "Cambios de diseño TIPO B v2.2" (punto 9): hora y
                  lugar por separado — la hora destacada en negrita y color
                  principal (antes ambos heredaban `text-ink-4` del <p>
                  padre, sin distinguirse del nombre del lugar). Los datos ya
                  vienen estructurados en el modelo (`event.date`/`time`/
                  `location.name`, ver EventLocation en types/index.ts) —
                  sin parseo de string combinado tipo `rLugLinea`. */}
              <span
                data-testid="event-card-hour"
                className="flex flex-shrink-0 items-center gap-1 font-bold text-primary"
              >
                <Clock className="h-3 w-3" aria-hidden />
                {dateRangeMain}
                {showsNextDaySuffix && <span className="text-[10px] font-normal text-ink-5"> +1</span>}
                {" hs"}
              </span>
              <span className="flex min-w-0 items-center gap-1 truncate">
                <MapPin className="h-3 w-3 flex-shrink-0 text-primary" aria-hidden />
                <span className="truncate">{event.location.name}</span>
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
