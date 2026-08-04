import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EventDetailPage } from "@/features/events/components/EventDetailPage";
import type { EventDetail } from "@/features/events/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sinPermiso?: string }>;
}

async function fetchEventForMetadata(id: string): Promise<EventDetail | null> {
  try {
    const response = await fetch(`${API_URL}/api/events/${id}`, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as EventDetail;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const event = await fetchEventForMetadata(id);

  if (!event) {
    return { title: "Evento — seSALE" };
  }

  const description = (event.description ?? "").slice(0, 160);
  const image = event.flyer_url ?? undefined;

  return {
    title: `${event.title} — seSALE`,
    description,
    openGraph: {
      title: `${event.title} — seSALE`,
      description,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function EventoDetallePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { sinPermiso } = await searchParams;

  return (
    <main className="container mx-auto flex max-w-2xl flex-col gap-4 py-6">
      <Link href="/" className="flex items-center gap-3 border-b border-border pb-3 text-ink-3">
        <ArrowLeft className="h-5 w-5 text-primary" aria-hidden />
        <span className="text-sm font-medium">Volver</span>
      </Link>
      {sinPermiso && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          No tenés permiso para editar este evento.
        </p>
      )}
      <div className="px-1">
        <EventDetailPage eventId={id} />
      </div>
    </main>
  );
}
