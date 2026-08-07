import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { MyEventsView } from "@/features/events/components/MyEventsView";

interface MisEventosPageProps {
  searchParams: Promise<{ published?: string }>;
}

export default async function MisEventosPage({ searchParams }: MisEventosPageProps) {
  const { published } = await searchParams;

  return (
    <main className="container mx-auto flex max-w-2xl flex-col gap-6 py-6">
      <header className="flex flex-col gap-4">
        <Link href="/" className="flex items-center gap-3 border-b border-border pb-3 text-ink-3">
          <ArrowLeft className="h-5 w-5 text-primary" aria-hidden />
          <span className="text-sm font-medium">Volver</span>
        </Link>
        <h1 className="px-1 text-2xl font-black tracking-tight">Mis eventos</h1>
      </header>

      {published === "1" && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm font-semibold text-brand-green"
        >
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" aria-hidden />
          Evento publicado. Quedó pendiente de aprobación — te avisamos cuando esté visible.
        </p>
      )}

      <MyEventsView />
    </main>
  );
}
