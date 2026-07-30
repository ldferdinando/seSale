import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_STYLES, DEFAULT_CATEGORY_STYLE } from "@/features/events/lib/categoryStyles";
import type { Event } from "@/features/events/types";

const PLAN_LABEL: Record<Event["plan"], string> = {
  pro: "Destacado Plus",
  dest: "Destacado",
  gratis: "Gratis",
};

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const eventDate = parseISO(event.date);
  const style = CATEGORY_STYLES[event.category] ?? DEFAULT_CATEGORY_STYLE;
  const Icon = style.icon;

  return (
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
            <Badge variant={event.plan === "gratis" ? "muted" : "default"} className="flex-shrink-0">
              {PLAN_LABEL[event.plan]}
            </Badge>
          </div>
          <p className="mt-1 flex items-center gap-1 truncate text-xs text-ink-4">
            <MapPin className="h-3 w-3 flex-shrink-0 text-primary" aria-hidden />
            {event.location.name}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
