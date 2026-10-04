"use client";

import { useMemo, type ReactNode } from "react";
import { CalendarX } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { EventCard } from "@/features/events/components/EventCard";
import { useEvents } from "@/features/events/hooks/useEvents";
import { sortEventsForAgenda } from "@/features/events/lib/sortEvents";
import type { EventFiltersState } from "@/features/events/types";

interface EventListProps {
  filters: EventFiltersState;
  /** false pausa el fetch (ej. mientras se detecta la ciudad activa) y muestra el skeleton. Default: true. */
  enabled?: boolean;
  /** Etapa 13a — estado vacío custom (ej. la página de categoría muestra una
   * card con CTA). Si no viene, se usa el texto por defecto. */
  emptyState?: ReactNode;
}

/** Leyenda de "sin resultados" (Home y categoría detalle con filtros). */
export const EMPTY_EVENTS_MESSAGE = "Aún no se registran eventos";

export function EventList({ filters, enabled = true, emptyState }: EventListProps) {
  const { data, isLoading, isError } = useEvents(filters, { enabled });
  const sortedEvents = useMemo(() => sortEventsForAgenda(data ?? []), [data]);

  if (isLoading || !enabled) {
    return (
      <div data-testid="event-list-loading" className="flex flex-col gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <p role="alert" className="text-sm text-muted-foreground">
        No pudimos cargar los eventos. Intentá de nuevo más tarde.
      </p>
    );
  }

  if (sortedEvents.length === 0) {
    if (emptyState) return <>{emptyState}</>;
    return (
      <div
        data-testid="event-list-empty"
        className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-surface-4 bg-surface-2 px-6 py-12 text-center"
      >
        <CalendarX className="h-9 w-9 text-ink-5" aria-hidden />
        <p className="text-sm font-bold text-ink-3">{EMPTY_EVENTS_MESSAGE}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {sortedEvents.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
