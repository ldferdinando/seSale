import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Crown, MapPin, Star } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_STYLES, DEFAULT_CATEGORY_STYLE } from "@/features/events/lib/categoryStyles";
import { EVENT_CATEGORIES, type Event } from "@/features/events/types";

const VISIBLE_CATEGORY_BADGES = 2;

/** Badges de categoría del evento: las primeras 2, con "+N" si hay más. */
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
 * Badge de plan, siguiendo el estilo de seSALE.html:
 * - pro (Destacado Plus): gradiente + ícono corona (.bpro)
 * - dest (Destacado): sólido + ícono estrella (.bdest)
 * - gratis: sin badge (.bfree no se usa — el diseño reserva ese estilo para
 *   "gratis" solo cuando el evento no tiene precio de entrada, no por plan)
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

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const eventDate = parseISO(event.date);
  const style = CATEGORY_STYLES[event.categories[0]] ?? DEFAULT_CATEGORY_STYLE;
  const Icon = style.icon;

  return (
    <Link href={`/eventos/${event.id}`} data-testid="event-card-link">
      <Card data-testid="event-card" className="overflow-hidden transition-colors hover:border-primary/40">
        <CardContent className="flex items-center gap-3 p-3">
          <div className="flex min-w-[34px] flex-col items-center text-center">
            <span className="text-lg font-extrabold leading-none tracking-tight text-primary">
              {format(eventDate, "d")}
            </span>
            <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-ink-4">
              {format(eventDate, "MMM", { locale: es })}
            </span>
          </div>

          {/* Flyer si existe, o placeholder con el color/ícono de la categoría */}
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg"
            style={{ backgroundColor: event.flyer_url ? undefined : `${style.color}22` }}
          >
            {event.flyer_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.flyer_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Icon className="h-[18px] w-[18px]" style={{ color: style.color }} aria-hidden />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-sm font-bold text-foreground">{event.title}</p>
              <PlanBadge plan={event.plan} />
            </div>
            <p className="mt-1 flex items-center gap-1 truncate text-xs text-ink-4">
              <MapPin className="h-3 w-3 flex-shrink-0 text-primary" aria-hidden />
              {event.location.name}
            </p>
            <div className="mt-1.5">
              <CategoryBadges categories={event.categories} />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
