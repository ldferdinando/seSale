"use client";

import Link from "next/link";
import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { EventCard } from "@/features/events/components/EventCard";
import { useMyEvents } from "@/features/events/hooks/useMyEvents";
import type { EventStatus } from "@/features/events/types";

const STATUS_TABS: { value: EventStatus; label: string }[] = [
  { value: "pending", label: "Pendientes" },
  { value: "approved", label: "Aprobados" },
  { value: "rejected", label: "Rechazados" },
];

export function MyEventsView() {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const [status, setStatus] = useState<EventStatus>("pending");
  const { data, isLoading, isError } = useMyEvents(Boolean(currentUser));

  if (isLoadingUser) {
    return (
      <div data-testid="my-events-loading" className="flex flex-col gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <p className="text-sm text-muted-foreground">
        Iniciá sesión para ver tus eventos.{" "}
        <Link href="/login" className="font-semibold text-primary">
          Ingresar
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
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
    </div>
  );
}
