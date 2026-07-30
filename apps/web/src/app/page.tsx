"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { EventFilters } from "@/features/events/components/EventFilters";
import { EventList } from "@/features/events/components/EventList";
import type { EventFiltersState } from "@/features/events/types";

export default function HomePage() {
  const [filters, setFilters] = useState<EventFiltersState>({});

  return (
    <main className="container mx-auto flex max-w-2xl flex-col gap-6 py-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            se<span className="text-primary">SALE</span>
          </h1>
          <p className="text-sm text-muted-foreground">Agenda cultural del Alto Valle</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/mis-eventos">Mis eventos</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/publicar">Publicar evento</Link>
          </Button>
        </div>
      </header>

      <EventFilters filters={filters} onChange={setFilters} />

      <EventList filters={filters} />
    </main>
  );
}
