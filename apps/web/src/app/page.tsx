"use client";

import { useState } from "react";

import { AdSlots } from "@/features/events/components/AdSlots";
import { CategoryChips } from "@/features/events/components/CategoryChips";
import { EventFilters } from "@/features/events/components/EventFilters";
import { EventList } from "@/features/events/components/EventList";
import { MapPlaceholder } from "@/features/events/components/MapPlaceholder";
import { MomentPills } from "@/features/events/components/MomentPills";
import { ShareBanner } from "@/features/events/components/ShareBanner";
import { StatsBar } from "@/features/events/components/StatsBar";
import { TodayBanner } from "@/features/events/components/TodayBanner";
import { ViewTabs, type EventView } from "@/features/events/components/ViewTabs";
import { getDateRangeForPreset } from "@/features/events/lib/dateRanges";
import type { EventFiltersState } from "@/features/events/types";
import { useActiveCity } from "@/hooks/useActiveCity";

export default function HomePage() {
  const [filters, setFilters] = useState<EventFiltersState>({});
  const [view, setView] = useState<EventView>("lista");
  const { activeCity, isDetecting } = useActiveCity();

  const effectiveFilters: EventFiltersState = activeCity ? { ...filters, cityId: activeCity.id } : filters;

  return (
    <main className="flex flex-col">
      <section className="relative overflow-hidden border-b border-border px-4 py-9">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-primary" />
        <div className="container mx-auto max-w-2xl">
          <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            Alto Valle · Patagonia
          </p>
          <h1 className="mb-2.5 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            Todo lo que pasa en <em className="text-primary not-italic">General Roca</em>,
            <br />
            en un lugar.
          </h1>
          <p className="text-sm leading-relaxed text-ink-4">
            Música, teatro, ferias, fiestas y más. Los mejores planes cerca tuyo.
          </p>
        </div>
      </section>

      <div className="container mx-auto max-w-2xl">
        <TodayBanner
          onClick={() =>
            setFilters((f) => ({
              ...f,
              ...getDateRangeForPreset("hoy"),
              moment: new Date().getHours() >= 20 ? "nocturno" : undefined,
            }))
          }
        />

        <MomentPills value={filters.moment} onChange={(moment) => setFilters((f) => ({ ...f, moment }))} />

        <AdSlots />

        <CategoryChips
          category={filters.category}
          onChange={(category) => setFilters((f) => ({ ...f, category }))}
        />

        <ViewTabs value={view} onChange={setView} />

        {view === "lista" ? (
          <>
            <div className="flex flex-col gap-4 px-4 pt-3.5">
              <EventFilters filters={filters} onChange={setFilters} />
              <EventList filters={effectiveFilters} enabled={!isDetecting} />
            </div>
            <ShareBanner />
          </>
        ) : (
          <MapPlaceholder />
        )}

        <StatsBar />
      </div>
    </main>
  );
}
