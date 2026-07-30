import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <Card data-testid="event-card">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{event.title}</CardTitle>
          <Badge variant={event.plan === "gratis" ? "muted" : "default"}>{PLAN_LABEL[event.plan]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
        <span>{format(eventDate, "EEEE d 'de' MMMM", { locale: es })}</span>
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {event.location.name}
        </span>
      </CardContent>
    </Card>
  );
}
