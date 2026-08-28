"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { EventForm } from "@/features/events/components/EventForm";
import { FlyerUpload } from "@/features/events/components/FlyerUpload";
import { useEvent } from "@/features/events/hooks/useEvent";
import type { EventFormValues } from "@/features/events/schemas/event-schema";
import { argentinaTodayIso, utcTimeToLocal } from "@/lib/date-helpers";

interface EditarEventoClientProps {
  eventId: string;
}

export function EditarEventoClient({ eventId }: EditarEventoClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const { data: event, isLoading: isLoadingEvent, isError } = useEvent(eventId);
  const [notice, setNotice] = useState<string | null>(null);

  const isOwner = Boolean(currentUser && event && currentUser.id === event.organizer_id);
  const isAdmin = currentUser?.role === "admin";
  const canEdit = isOwner || isAdmin;
  // Etapa 12a: el organizador (no admin) puede editar los links de contacto
  // hasta el día anterior al evento — a partir de date<=hoy, el formulario
  // completo queda deshabilitado. El admin nunca tiene esta restricción.
  const isPastEvent = Boolean(event && event.date <= argentinaTodayIso());
  const lockedForOwner = isOwner && !isAdmin && isPastEvent;

  useEffect(() => {
    if (isLoadingUser) return;
    if (!currentUser) {
      router.push("/login");
      return;
    }
    if (isLoadingEvent || isError) return;
    if (event && !canEdit) {
      router.push(`/eventos/${eventId}?sinPermiso=1`);
    }
  }, [isLoadingUser, currentUser, isLoadingEvent, isError, event, canEdit, eventId, router]);

  function handleSuccess() {
    if (isOwner && !isAdmin) {
      setNotice("Tu evento fue enviado a revisión nuevamente.");
      setTimeout(() => router.push("/mis-eventos"), 1200);
    } else {
      router.push(`/eventos/${eventId}`);
    }
  }

  if (isLoadingUser || isLoadingEvent) {
    return (
      <div data-testid="edit-event-loading" className="flex flex-col gap-3">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !event || !currentUser || !canEdit) {
    return null;
  }

  const initialValues: Partial<EventFormValues> = {
    title: event.title,
    description: event.description ?? "",
    date: event.date,
    // event.time/time_end vienen en UTC de la API — el form los muestra y
    // los reenvía en hora argentina (events-api.ts hace la conversión de
    // vuelta a UTC recién al mandar el payload).
    time: utcTimeToLocal(event.date, event.time.slice(0, 5)),
    time_end: utcTimeToLocal(event.date, event.time_end.slice(0, 5)),
    // Etapa 10b: date_end no se convierte (es un día de negocio, igual que
    // date) — ya viene siempre resuelto desde la API (nunca null).
    date_end: event.date_end,
    categories: event.categories,
    city_id: event.city_id,
    // Etapa 7b: precarga en modo "preset" con la ubicación actual del
    // evento — EventLocationField la trae por id (funciona con lugares
    // públicos o privados). Si el organizador no toca la Tab de lugar,
    // no se crea ningún Location nuevo al guardar.
    location_mode: "preset",
    location_id: event.location.id,
    ticket_type: event.ticket_type,
    price_at_door: event.price_at_door != null ? String(event.price_at_door) : "",
    price_advance: event.price_advance != null ? String(event.price_advance) : "",
    available_on_site: event.available_on_site,
    contact_whatsapp: event.contact_whatsapp ?? "",
    contact_instagram: event.contact_instagram ?? "",
    contact_facebook: event.contact_facebook ?? "",
    contact_web: event.contact_web ?? "",
    contact_email: event.contact_email ?? "",
  };

  if (notice) {
    return <p className="text-sm text-primary">{notice}</p>;
  }

  return (
    <main className="container mx-auto flex max-w-2xl flex-col gap-6 py-6">
      <header className="flex flex-col gap-4">
        <Link href={`/eventos/${eventId}`} className="flex items-center gap-3 border-b border-border pb-3 text-ink-3">
          <ArrowLeft className="h-5 w-5 text-primary" aria-hidden />
          <span className="text-sm font-medium">Volver</span>
        </Link>
        <div className="flex flex-col gap-1 px-1">
          <h1 className="text-2xl font-black tracking-tight">Editar evento</h1>
        </div>
      </header>

      <EventForm
        mode="edit"
        eventId={eventId}
        initialValues={initialValues}
        onSuccess={handleSuccess}
        disabledReason={lockedForOwner ? "Este evento ya pasó y no se puede editar." : undefined}
      />

      {/* Etapa 8b/12b — flyer dual (desktop + mobile), exclusivo del plan
          Destacado Plus para el organizador; el admin lo puede gestionar con
          cualquier plan. La subida ocurre acá (no en /planes): el evento
          recién pasa a plan="pro" cuando se confirma el pago. */}
      {(event.plan === "pro" || isAdmin) && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <FlyerUpload
            eventId={eventId}
            flyerUrlDesktop={event.flyer_url_desktop}
            flyerUrlMobile={event.flyer_url_mobile}
            canUpload={isAdmin || event.plan === "pro"}
            onChange={() => queryClient.invalidateQueries({ queryKey: ["event", eventId] })}
          />
        </div>
      )}
    </main>
  );
}
