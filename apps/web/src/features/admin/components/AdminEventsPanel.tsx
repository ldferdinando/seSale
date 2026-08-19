"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Check, Eye, Pencil, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCities } from "@/features/auth/hooks/useCities";
import { PlanBadge } from "@/features/events/components/EventCard";
import {
  isRelevantOrganizerSubscription,
  OrganizerSubscriptionBadge,
} from "@/features/events/components/OrganizerSubscriptionBadge";
import { useAdminEvents } from "@/features/events/hooks/useAdminEvents";
import { useDeleteEvent } from "@/features/events/hooks/useDeleteEvent";
import { useUpdateEventStatus } from "@/features/events/hooks/useUpdateEventStatus";
import {
  EVENT_CATEGORIES,
  STATUS_OPTIONS,
  type AdminEvent,
  type AdminEventFilters,
  type EventStatus,
} from "@/features/events/types";

function StatusBadge({ status }: { status: EventStatus }) {
  if (status === "approved") {
    return (
      <Badge variant="default" className="bg-brand-green text-white">
        Aprobado
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge variant="muted" className="bg-destructive/15 text-destructive">
        Rechazado
      </Badge>
    );
  }
  return <Badge variant="muted">Pendiente</Badge>;
}

function AdminEventRow({ event }: { event: AdminEvent }) {
  const updateStatus = useUpdateEventStatus();
  const deleteEvent = useDeleteEvent();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    await deleteEvent.mutateAsync(event.id);
    setConfirmingDelete(false);
  }

  return (
    <div
      data-testid="admin-event-row"
      className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-start sm:justify-between"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-bold text-foreground">{event.title}</p>
          <StatusBadge status={event.status} />
          <PlanBadge plan={event.plan} />
          {!event.is_active && <Badge variant="muted">Eliminado</Badge>}
        </div>
        <p className="mt-1 text-xs text-ink-4">
          {event.organizer_public_name} · {event.location.name} · {event.categories.join(", ")}
        </p>
        <p className="mt-1 text-xs text-ink-5">{format(parseISO(event.date), "d MMM yyyy", { locale: es })}</p>
        {isRelevantOrganizerSubscription(event.status, event.organizer_subscription) && (
          <div className="mt-2">
            <OrganizerSubscriptionBadge subscription={event.organizer_subscription} />
          </div>
        )}
      </div>

      <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
        {event.status === "pending" && (
          <>
            <Button
              type="button"
              size="sm"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ eventId: event.id, status: "approved" })}
              className="flex items-center gap-1"
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
              Aprobar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ eventId: event.id, status: "rejected" })}
              className="flex items-center gap-1"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Rechazar
            </Button>
          </>
        )}

        <Link
          href={`/eventos/${event.id}`}
          className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-ink-2"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden />
          Ver detalle
        </Link>

        <Link
          href={`/eventos/${event.id}/editar`}
          className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-ink-2"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          Editar
        </Link>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={deleteEvent.isPending}
          onClick={handleDelete}
          onBlur={() => setConfirmingDelete(false)}
          className={confirmingDelete ? "flex items-center gap-1 bg-destructive/15 text-destructive" : "flex items-center gap-1"}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          {confirmingDelete ? "Confirmar" : "Eliminar"}
        </Button>
      </div>
    </div>
  );
}

export function AdminEventsPanel({ initialOrganizerId }: { initialOrganizerId?: string }) {
  const [filters, setFilters] = useState<AdminEventFilters>({ organizer_id: initialOrganizerId });
  const { data: events, isLoading, isError } = useAdminEvents(filters);
  const { data: cities } = useCities();

  // Etapa 9b: "Ver eventos del usuario" (panel de Usuarios) cambia de tab y
  // manda un organizer_id nuevo mientras este panel ya está montado.
  useEffect(() => {
    setFilters((prev) => ({ ...prev, organizer_id: initialOrganizerId }));
  }, [initialOrganizerId]);

  function updateFilter<K extends keyof AdminEventFilters>(key: K, value: AdminEventFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="px-1 text-lg font-bold text-foreground">Eventos</h2>

      {filters.organizer_id && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-ink-3">
          <span>Mostrando solo los eventos de este organizador.</span>
          <Button type="button" size="sm" variant="ghost" onClick={() => updateFilter("organizer_id", undefined)}>
            Quitar filtro
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Select
          value={filters.status ?? "__all__"}
          onValueChange={(value) => updateFilter("status", value === "__all__" ? undefined : (value as EventStatus))}
        >
          <SelectTrigger aria-label="Filtrar por status" className="w-[160px]">
            <SelectValue placeholder="Todos los status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.category ?? "__all__"}
          onValueChange={(value) => updateFilter("category", value === "__all__" ? undefined : value)}
        >
          <SelectTrigger aria-label="Filtrar por categoría" className="w-[180px]">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas</SelectItem>
            {EVENT_CATEGORIES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.city_id ?? "__all__"}
          onValueChange={(value) => updateFilter("city_id", value === "__all__" ? undefined : value)}
        >
          <SelectTrigger aria-label="Filtrar por ciudad" className="w-[160px]">
            <SelectValue placeholder="Todas las ciudades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas</SelectItem>
            {cities?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          value={filters.search ?? ""}
          onChange={(e) => updateFilter("search", e.target.value)}
          placeholder="Buscar por título..."
          aria-label="Buscar evento"
          className="w-[200px]"
        />
      </div>

      {isLoading && (
        <div data-testid="admin-events-loading" className="flex flex-col gap-3">
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
        <p className="text-sm text-muted-foreground">No hay eventos que coincidan con los filtros.</p>
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
