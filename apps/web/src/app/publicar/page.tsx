import Link from "next/link";

import { EventForm } from "@/features/events/components/EventForm";

export default function PublicarEventoPage() {
  return (
    <main className="container mx-auto flex max-w-2xl flex-col gap-6 py-8">
      <header className="flex flex-col gap-1">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Volver
        </Link>
        <h1 className="text-2xl font-black tracking-tight">Publicar evento</h1>
        <p className="text-sm text-muted-foreground">
          Tu evento queda pendiente de aprobación antes de aparecer en la agenda.
        </p>
      </header>

      <EventForm />
    </main>
  );
}
