"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { PlanBadge } from "@/features/events/components/EventCard";
import { useEvents } from "@/features/events/hooks/useEvents";
import { useUpdateEventFeatured } from "@/features/events/hooks/useUpdateEventFeatured";
import { useUpdateEventPlan } from "@/features/events/hooks/useUpdateEventPlan";
import { PLAN_OPTIONS } from "@/features/events/types";
import type { Event, EventPlan } from "@/features/events/types";

function AdminEventRow({ event }: { event: Event }) {
  const { mutate: mutateFeatured, isPending: isTogglingFeatured } = useUpdateEventFeatured();
  const { mutate: mutatePlan, isPending: isChangingPlan } = useUpdateEventPlan();

  function toggleFeatured() {
    mutateFeatured({
      eventId: event.id,
      input: { is_featured: !event.is_featured, featured_until: event.featured_until },
    });
  }

  function changePlan(plan: EventPlan) {
    mutatePlan({ eventId: event.id, plan });
  }

  return (
    <div
      data-testid="admin-event-row"
      className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-bold text-foreground">{event.title}</p>
          <PlanBadge plan={event.plan} />
        </div>
        <p className="mt-1 text-xs text-ink-4">{event.location.name}</p>
        <p className="mt-1 text-xs text-ink-5">
          Destacado hasta:{" "}
          {event.featured_until ? format(parseISO(event.featured_until), "d MMM yyyy", { locale: es }) : "indefinido"}
        </p>
      </div>

      <div className="flex flex-shrink-0 items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={event.is_featured}
          aria-label={`Destacado — ${event.title}`}
          disabled={isTogglingFeatured}
          onClick={toggleFeatured}
          className={`h-6 w-11 flex-shrink-0 rounded-full border transition-colors ${
            event.is_featured ? "border-primary bg-primary" : "border-border bg-surface-5"
          }`}
        >
          <span
            className={`block h-4 w-4 translate-y-0.5 rounded-full bg-white transition-transform ${
              event.is_featured ? "translate-x-6" : "translate-x-0.5"
            }`}
          />
        </button>

        <Select value={event.plan} onValueChange={(value) => changePlan(value as EventPlan)} disabled={isChangingPlan}>
          <SelectTrigger aria-label={`Plan — ${event.title}`} className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLAN_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function AdminFeaturedPanel() {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const { data: events, isLoading: isLoadingEvents, isError } = useEvents({});

  if (isLoadingUser) {
    return (
      <div data-testid="admin-panel-loading" className="flex flex-col gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <p className="text-sm text-muted-foreground">
        Iniciá sesión para acceder al panel de administración.{" "}
        <Link href="/login" className="font-semibold text-primary">
          Ingresar
        </Link>
      </p>
    );
  }

  if (currentUser.role !== "admin") {
    return <p className="text-sm text-muted-foreground">No tenés permiso para ver esta sección.</p>;
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="px-1 text-lg font-bold text-foreground">Destacados</h2>

      {isLoadingEvents && (
        <div data-testid="admin-panel-loading" className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {isError && (
        <p role="alert" className="text-sm text-muted-foreground">
          No pudimos cargar los eventos. Intentá de nuevo más tarde.
        </p>
      )}

      {events && events.length === 0 && (
        <p className="text-sm text-muted-foreground">No hay eventos aprobados todavía.</p>
      )}

      {events && events.length > 0 && (
        <div className="flex flex-col gap-3">
          {events.map((event) => (
            <AdminEventRow key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  );
}
