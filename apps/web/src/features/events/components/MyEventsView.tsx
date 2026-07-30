"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { EventCard } from "@/features/events/components/EventCard";
import { useMyEvents } from "@/features/events/hooks/useMyEvents";
import { useOrganizerId } from "@/features/events/hooks/useOrganizerId";
import type { EventStatus } from "@/features/events/types";

const STATUS_TABS: { value: EventStatus; label: string }[] = [
  { value: "pending", label: "Pendientes" },
  { value: "approved", label: "Aprobados" },
  { value: "rejected", label: "Rechazados" },
];

export function MyEventsView() {
  const { organizerId, setOrganizerId } = useOrganizerId();
  const [status, setStatus] = useState<EventStatus>("pending");
  const { data, isLoading, isError } = useMyEvents(organizerId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Label htmlFor="organizer_id">ID de organizador (temporal, sin login todavía)</Label>
        <Input
          id="organizer_id"
          value={organizerId}
          onChange={(e) => setOrganizerId(e.target.value)}
          placeholder="UUID del organizador"
        />
      </div>

      {!organizerId && <p className="text-sm text-muted-foreground">Ingresá tu ID de organizador para ver tus eventos.</p>}

      {organizerId && (
        <>
          <Tabs tabs={STATUS_TABS} value={status} onChange={(value) => setStatus(value as EventStatus)} />

          {isLoading && (
            <div data-testid="my-events-loading" className="flex flex-col gap-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}

          {isError && (
            <p role="alert" className="text-sm text-muted-foreground">
              No pudimos cargar tus eventos. Intentá de nuevo más tarde.
            </p>
          )}

          {data && data[status].length === 0 && (
            <p className="text-sm text-muted-foreground">No tenés eventos en este estado.</p>
          )}

          {data && data[status].length > 0 && (
            <div className="flex flex-col gap-3">
              {data[status].map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
