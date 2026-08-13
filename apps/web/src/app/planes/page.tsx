"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { useEvent } from "@/features/events/hooks/useEvent";
import { PlansList } from "@/features/plans/components/PlansList";

export default function PlanesPage() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event_id") ?? "";

  const { data: event, isLoading, isError } = useEvent(eventId, { enabled: Boolean(eventId) });

  return (
    <main className="container mx-auto flex max-w-2xl flex-col gap-6 py-6">
      <header className="flex flex-col gap-4">
        <Link href="/" className="flex items-center gap-3 border-b border-border pb-3 text-ink-3">
          <ArrowLeft className="h-5 w-5 text-primary" aria-hidden />
          <span className="text-sm font-medium">Volver</span>
        </Link>
        <h1 className="px-1 text-2xl font-black tracking-tight">Elegí tu plan</h1>
        <p className="px-1 text-sm text-ink-4">
          Mejorá la visibilidad de tus eventos en seSALE con un plan Destacado o Destacado Plus.
        </p>
      </header>

      {!eventId && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-foreground">
            Un plan destaca UN evento puntual, no toda tu cuenta. Elegí desde qué evento querés contratarlo.
          </p>
          <Link href="/mis-eventos" className="w-fit text-sm font-semibold text-primary">
            Ir a Mis eventos →
          </Link>
        </div>
      )}

      {eventId && isLoading && <Skeleton className="h-24 w-full" />}

      {eventId && !isLoading && (isError || !event) && (
        <p role="alert" className="text-sm text-destructive">
          No encontramos ese evento o no tenés permiso para elegirle un plan.
        </p>
      )}

      {eventId && event && (
        <>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-ink-4">Vas a destacar</p>
            <p className="text-sm font-bold text-foreground">{event.title}</p>
          </div>
          <PlansList eventId={eventId} />
        </>
      )}
    </main>
  );
}
