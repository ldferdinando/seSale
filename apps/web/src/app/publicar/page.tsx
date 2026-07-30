import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { EventForm } from "@/features/events/components/EventForm";

export default function PublicarEventoPage() {
  return (
    <main className="container mx-auto flex max-w-2xl flex-col gap-6 py-6">
      <header className="flex flex-col gap-4">
        <Link href="/" className="flex items-center gap-3 border-b border-border pb-3 text-ink-3">
          <ArrowLeft className="h-5 w-5 text-primary" aria-hidden />
          <span className="text-sm font-medium">Volver</span>
        </Link>
        <div className="flex flex-col gap-1 px-1">
          <h1 className="text-2xl font-black tracking-tight">Publicar evento</h1>
          <p className="text-sm text-ink-4">
            Tu evento queda pendiente de aprobación antes de aparecer en la agenda.
          </p>
        </div>
      </header>

      <EventForm />
    </main>
  );
}
