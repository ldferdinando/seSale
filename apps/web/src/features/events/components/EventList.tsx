"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { EventCard } from "@/features/events/components/EventCard";
import { useEvents } from "@/features/events/hooks/useEvents";
import type { EventFiltersState } from "@/features/events/types";

interface EventListProps {
  filters: EventFiltersState;
}

export function EventList({ filters }: EventListProps) {
  const { data, isLoading, isError } = useEvents(filters);

  if (isLoading) {
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
