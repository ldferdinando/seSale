"use client";

import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { EventDetailView } from "@/features/events/components/EventDetailView";
import { useEvent } from "@/features/events/hooks/useEvent";

interface EventDetailPageProps {
  eventId: string;
}

export function EventDetailPage({ eventId }: EventDetailPageProps) {
  const { data: event, isLoading, isError } = useEvent(eventId);

  if (isLoading) {
    return (
      <div data-testid="event-detail-loading" className="flex flex-col gap-3">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-muted-foreground">No encontramos este evento.</p>
        <Link href="/" className="text-sm font-semibold text-primary">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return <EventDetailView event={event} />;
}
