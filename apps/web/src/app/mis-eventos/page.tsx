import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { MyEventsView } from "@/features/events/components/MyEventsView";

export default function MisEventosPage() {
  return (
    <main className="container mx-auto flex max-w-2xl flex-col gap-6 py-6">
      <header className="flex flex-col gap-4">
        <Link href="/" className="flex items-center gap-3 border-b border-border pb-3 text-ink-3">
          <ArrowLeft className="h-5 w-5 text-primary" aria-hidden />
          <span className="text-sm font-medium">Volver</span>
        </Link>
        <h1 className="px-1 text-2xl font-black tracking-tight">Mis eventos</h1>
      </header>

      <MyEventsView />
    </main>
  );
}
