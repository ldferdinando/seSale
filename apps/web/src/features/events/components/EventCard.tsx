import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, Crown, Image as ImageIcon, MapPin, Star } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_STYLES, DEFAULT_CATEGORY_STYLE } from "@/features/events/lib/categoryStyles";
import { EVENT_CATEGORIES, type Event } from "@/features/events/types";
import { resolveMediaUrl } from "@/lib/media";
import { formatEventTime, toEventDateTimeISO } from "@/lib/date-helpers";
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
 * Jerarquía visual de plan, calcada de seSALE.html (`.evi-dest`/`.evi-plus`):
 * - gratis: sin clases extra, la fila queda con el estilo base de `Card`.
 * - dest: fondo degradé sutil + borde completo 1.5px en rosa.
 * - pro: mismo criterio + borde más grueso (1.75px) y una rayita de acento
 *   de 6px a la izquierda, exclusiva de este nivel.
 * Ningún nivel pago lleva etiqueta de texto — la diferencia es 100% visual.
 */
function planCardClasses(plan: Event["plan"]): string {
  if (plan === "pro") {
    return "border-[1.75px] border-[#E91E8C99] border-l-[6px] border-l-brand-pink bg-[linear-gradient(160deg,#2a0d1f,#150910)]";
  }
  if (plan === "dest") {
    return "border-[1.5px] border-[#E91E8C77] bg-[linear-gradient(135deg,#E91E8C22,#E91E8C0d)]";
  }
  return "";
}

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const eventDate = parseISO(event.date);
  const category = event.categories[0];
  const style = CATEGORY_STYLES[category] ?? DEFAULT_CATEGORY_STYLE;
  const categoryLabel = EVENT_CATEGORIES.find((c) => c.value === category)?.label ?? category;
  const Icon = style.icon;
  const isPro = event.plan === "pro";

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
        <CardContent className="flex items-center gap-3 p-3">
          <div className="flex min-w-[34px] flex-col items-center text-center">
            <span className="text-lg font-extrabold leading-none tracking-tight text-primary">
              {format(eventDate, "d")}
            </span>
            <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-ink-4">
              {format(eventDate, "MMM", { locale: es })}
            </span>
          </div>

          {/* Destacado Plus: miniatura de flyer (o placeholder) 44×44 en vez
              del ícono de categoría — exclusivo de este nivel (ver `.evi-plus-thumb`
              en seSALE.html). Los demás niveles siguen mostrando el ícono de
              categoría (dest/gratis nunca suben flyer, ver ARCHITECTURE.md). */}
          {isPro ? (
            event.flyer_url ? (
              <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveMediaUrl(event.flyer_url) ?? undefined}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-surface-2">
                <ImageIcon className="h-4 w-4 text-ink-4" aria-hidden />
              </div>
            )
          ) : (
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg"
              style={{ backgroundColor: `${style.color}22` }}
            >
              <Icon className="h-[18px] w-[18px]" style={{ color: style.color }} aria-hidden />
            </div>
          )}

          <div className="min-w-0 flex-1">
            {categoryLabel && (
              <p
                className="truncate text-[9px] font-bold uppercase tracking-[0.5px]"
                style={{ color: style.color }}
              >
                {categoryLabel}
              </p>
            )}
            <p className="flex min-w-0 items-center gap-1.5 truncate text-sm font-bold text-foreground">
              <span className="truncate">{event.title}</span>
              {!event.is_active && (
                <span
                  data-testid="event-inactive-badge"
                  className="flex-shrink-0 rounded-full bg-surface-5 px-2 py-0.5 text-[9px] font-bold text-ink-3"
                >
                  Dado de baja
                </span>
              )}
            </p>
            <p className="mt-1 flex items-center gap-2 truncate text-xs text-ink-4">
              <span className="flex flex-shrink-0 items-center gap-1">
                <Clock className="h-3 w-3 text-primary" aria-hidden />
                {formatEventTime(toEventDateTimeISO(event.date, event.time))} hs
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
