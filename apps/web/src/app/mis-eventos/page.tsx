import Link from "next/link";

import { MyEventsView } from "@/features/events/components/MyEventsView";

export default function MisEventosPage() {
  return (
    <main className="container mx-auto flex max-w-2xl flex-col gap-6 py-8">
      <header className="flex flex-col gap-1">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Volver
        </Link>
        <h1 className="text-2xl font-black tracking-tight">Mis eventos</h1>
      </header>

      <MyEventsView />
    </main>
  );
}
