"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import { AdSlots, AdSlotsGrid } from "@/features/events/components/AdSlots";
import { CategoryChips } from "@/features/events/components/CategoryChips";
import { EventFilters } from "@/features/events/components/EventFilters";
import { EventList } from "@/features/events/components/EventList";
import { ShareBanner } from "@/features/events/components/ShareBanner";
import { StatsBar } from "@/features/events/components/StatsBar";
import { TodayBanner } from "@/features/events/components/TodayBanner";
import { ViewTabs, type EventView } from "@/features/events/components/ViewTabs";
import { getDateRangeForPreset } from "@/features/events/lib/dateRanges";
import { useEvents } from "@/features/events/hooks/useEvents";
import type { EventFiltersState } from "@/features/events/types";
import { useActiveCity } from "@/hooks/useActiveCity";

const EventsMap = dynamic(() => import("@/components/EventsMap").then((m) => m.EventsMap), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

/** Mismo alto/estilo que .mapa-cont del diseño mientras se detecta la
 * ciudad o se cargan los eventos del mapa. */
function MapSkeleton() {
  return (
    <div
      className="mx-5 mb-5 mt-3.5 h-[340px] rounded-[14px] border border-[#1e1e1e] bg-[#0f0f0f]"
      data-testid="map-skeleton"
    />
  );
}

export default function HomePage() {
  const [filters, setFilters] = useState<EventFiltersState>({});
  const [view, setView] = useState<EventView>("lista");
  const { activeCity, isDetecting } = useActiveCity();
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);

  const effectiveFilters: EventFiltersState = activeCity ? { ...filters, cityId: activeCity.id } : filters;

  const mapEvents = useEvents(effectiveFilters, { enabled: !isDetecting && view === "mapa" });

  return (
    <main className="flex flex-col">
      <section className="relative overflow-hidden border-b border-border px-4 py-9">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-primary" />
        <div className="container mx-auto max-w-2xl">
          <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-4">
            ESTÁS EN EL LUGAR CORRECTO, ENTERÁTE!
          </p>
          <h1 className="mb-2.5 text-[clamp(27px,6.8vw,42px)] font-black leading-tight tracking-tight">
            Todo lo que pasa en <em className="text-primary not-italic">{activeCity?.name ?? "tu ciudad"}</em>,
            <br />
            en un solo lugar.
          </h1>
          <p className="text-sm leading-relaxed text-ink-4">
            Música, teatro, ferias, fiestas y más. Los mejores planes cerca tuyo.
          </p>
        </div>
      </section>

      <div className="container mx-auto max-w-2xl">
        <TodayBanner
          onClick={() => {
            setFilters((f) => ({
              ...f,
              ...getDateRangeForPreset("hoy"),
              moment: new Date().getHours() >= 20 ? "nocturno" : undefined,
            }));
            // Scroll al inicio del listado (sección de tabs Grilla/Mapa) —
            // setTimeout para que React re-renderice con el filtro aplicado
            // antes de scrollear.
            setTimeout(() => {
              listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
          }}
        />

        <AdSlots />

        {/* Filtros — siempre visibles y por encima de las tabs de vista:
            filtran tanto la grilla como el mapa. Orden (seSALE.html):
            buscador → fecha → categorías → momento → tipo de entrada. */}
        <div className="px-4 pt-3.5">
          <EventFilters
            filters={filters}
            onChange={setFilters}
            categorySlot={
              <CategoryChips
                category={filters.category}
                onChange={(category) => setFilters((f) => ({ ...f, category }))}
              />
            }
          />
        </div>

        {/* Tabs de vista — DEBAJO de los filtros (orden de seSALE.html).
            listRef: destino del scroll al presionar "Ahora" en TodayBanner. */}
        <div ref={listRef} data-testid="events-list-anchor" className="scroll-mt-2">
          <ViewTabs value={view} onChange={setView} />
        </div>

        {/* Contenido: la grilla y el mapa son vistas alternativas del mismo
            listado filtrado — ocupan el mismo lugar del layout. */}
        {view === "lista" ? (
          <>
            <div className="px-4 pt-3.5">
              <EventList filters={effectiveFilters} enabled={!isDetecting} />
            </div>
            {/* Etapa 11b — Parte 4: separación visual entre el listado y los
                banners de abajo (mismo patrón border-t + pt-4 que StatsBar). */}
            <div className="mx-4 mt-5 border-t border-border">
              <AdSlotsGrid />
            </div>

            <ShareBanner />
          </>
        ) : isDetecting || mapEvents.isLoading || !activeCity ? (
          <MapSkeleton />
        ) : (
          <div
            data-testid="events-map-container"
            className="mx-5 mb-5 mt-3.5 h-[340px] overflow-hidden rounded-[14px] border border-[#1e1e1e] bg-[#0f0f0f]"
          >
            <EventsMap
              events={mapEvents.data ?? []}
              activeCity={activeCity}
              onEventClick={(eventId) => router.push(`/eventos/${eventId}`)}
            />
          </div>
        )}

        <StatsBar />
      </div>
    </main>
  );
}
