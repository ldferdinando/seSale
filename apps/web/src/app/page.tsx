"use client";

import { useState } from "react";

import { EventFilters } from "@/features/events/components/EventFilters";
import { EventList } from "@/features/events/components/EventList";
import type { EventFiltersState } from "@/features/events/types";

export default function HomePage() {
  const [filters, setFilters] = useState<EventFiltersState>({});

  return (
    <main className="flex flex-col">
      <section className="relative overflow-hidden border-b border-border px-4 py-9">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-primary" />
        <div className="container mx-auto max-w-2xl">
          <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            Alto Valle · Patagonia
          </p>
          <h1 className="mb-2.5 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            Descubrí lo que <em className="text-primary not-italic">se sale</em> en tu ciudad
          </h1>
          <p className="text-sm leading-relaxed text-ink-4">
            Música, teatro, ferias, fiestas y más. Los mejores planes cerca tuyo.
          </p>
        </div>
      </section>

      <div className="container mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
        <EventFilters filters={filters} onChange={setFilters} />

        <EventList filters={filters} />
      </div>
    </main>
  );
}
