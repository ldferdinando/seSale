"use client";

import { Copy, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/features/admin/components/ConfirmDialog";
import { useAuthStatus } from "@/features/auth/hooks/useAuthStatus";
import { EventCard } from "@/features/events/components/EventCard";
import { InstanceBadge } from "@/features/events/components/InstanceBadge";
import { useDeleteEvent } from "@/features/events/hooks/useDeleteEvent";
import { useMyEvents } from "@/features/events/hooks/useMyEvents";
import type { Event, EventStatus, OrganizerEvent } from "@/features/events/types";
import {
  PendingPaymentCard,
  selectResumablePayments,
} from "@/features/subscriptions/components/PendingPaymentCard";
import { useMySubscriptions } from "@/features/subscriptions/hooks/useMySubscriptions";

const STATUS_TABS: { value: EventStatus; label: string }[] = [
  { value: "pending", label: "Pendientes" },
  { value: "approved", label: "Aprobados" },
  { value: "rejected", label: "Rechazados" },
];

export function MyEventsView() {
  // useAuthStatus: en recarga completa no mostrar "Iniciá sesión" mientras
  // AuthProvider todavía restaura la sesión.
  const { status: authStatus, user: currentUser } = useAuthStatus();
  const isLoadingUser = authStatus === "loading";
  const [status, setStatus] = useState<EventStatus>("pending");
  const { data, isLoading, isError } = useMyEvents(Boolean(currentUser));
  // Feature "Duplicar evento" — GET /mine trae TODOS los eventos del
  // organizador (sin paginar), así que agrupar por instance_group_id para
  // el indicador "Instancia N" se puede calcular enteramente acá, sin pedir
  // nada más al backend.
  const allMyEvents: OrganizerEvent[] = data ? [...data.pending, ...data.approved, ...data.rejected] : [];
  // Pagos de MercadoPago interrumpidos (ventana cerrada): se muestran arriba
  // de las pestañas para que se vean sin importar en qué estado de
  // moderación esté el evento.
  const { data: subscriptions } = useMySubscriptions(Boolean(currentUser));
  const resumablePayments = selectResumablePayments(subscriptions);
  // Borrado lógico del propio evento (DELETE /api/events/{id}): el backend
  // marca deleted_at y deja de devolverlo en /api/events/mine. No se puede
  // deshacer desde la UI — por eso el diálogo de confirmación.
  const deleteEvent = useDeleteEvent();
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  function handleConfirmDelete() {
    if (!eventToDelete) return;
    deleteEvent.mutate(eventToDelete.id, {
      onSuccess: () => setDeleteMessage({ kind: "ok", text: "El evento fue eliminado." }),
      onError: () => setDeleteMessage({ kind: "error", text: "No pudimos eliminar el evento. Intentá de nuevo." }),
      onSettled: () => setEventToDelete(null),
    });
  }

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
      {resumablePayments.length > 0 && (
        <section aria-labelledby="pending-payments-title" className="flex flex-col gap-3">
          <h2 id="pending-payments-title" className="px-1 text-base font-bold text-foreground">
            Pagos sin completar
          </h2>
          {resumablePayments.map((subscription) => (
            <PendingPaymentCard key={subscription.id} subscription={subscription} />
          ))}
        </section>
      )}

      {deleteMessage && (
        <p
          role={deleteMessage.kind === "error" ? "alert" : "status"}
          className={deleteMessage.kind === "error" ? "text-sm text-destructive" : "text-sm font-semibold text-brand-green"}
        >
          {deleteMessage.text}
        </p>
      )}

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
            <div key={event.id} className="flex flex-col gap-1.5">
              <InstanceBadge
                currentEventId={event.id}
                instances={
                  event.instance_group_id
                    ? allMyEvents.filter((e) => e.instance_group_id === event.instance_group_id)
                    : []
                }
                getHref={(eventId) => `/eventos/${eventId}`}
              />
              <EventCard event={event} />
              <div className="flex justify-end gap-2">
                <Link
                  href={`/publicar?duplicar=${event.id}`}
                  className="flex w-fit items-center gap-1.5 self-end rounded-full px-3 py-1 text-xs font-bold text-ink-3"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                  Duplicar
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteMessage(null);
                    setEventToDelete(event);
                  }}
                  aria-label={`Eliminar ${event.title}`}
                  className="flex w-fit items-center gap-1.5 self-end rounded-full px-3 py-1 text-xs font-bold text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {eventToDelete && (
        <ConfirmDialog
          title="¿Seguro que querés eliminar este evento?"
          description={`"${eventToDelete.title}" dejará de aparecer en el sitio y en tus eventos. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          isConfirming={deleteEvent.isPending}
          onConfirm={handleConfirmDelete}
          onClose={() => setEventToDelete(null)}
        />
      )}
    </div>
  );
}
