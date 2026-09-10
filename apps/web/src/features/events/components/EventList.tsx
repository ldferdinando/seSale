"use client";

import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { EventCard } from "@/features/events/components/EventCard";
import { useEvents } from "@/features/events/hooks/useEvents";
import type { EventFiltersState } from "@/features/events/types";

interface EventListProps {
  filters: EventFiltersState;
  /** false pausa el fetch (ej. mientras se detecta la ciudad activa) y muestra el skeleton. Default: true. */
  enabled?: boolean;
  /** Etapa 13a — estado vacío custom (ej. la página de categoría muestra una
   * card con CTA). Si no viene, se usa el texto por defecto. */
  emptyState?: ReactNode;
}

export function EventList({ filters, enabled = true, emptyState }: EventListProps) {
  const { data, isLoading, isError } = useEvents(filters, { enabled });

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

  if (!data || data.length === 0) {
    if (emptyState) return <>{emptyState}</>;
    return <p className="text-sm text-muted-foreground">No hay eventos para mostrar con estos filtros.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {data.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
