"use client";

import { CalendarX, Sun, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AdGridPool } from "@/components/AdGridPool";
import { BannerSlot } from "@/components/BannerSlot";
import { Skeleton } from "@/components/ui/skeleton";
import { DateFilter } from "@/features/events/components/DateFilter";
import { EventList } from "@/features/events/components/EventList";
import { MomentPills } from "@/features/events/components/MomentPills";
import type { Category, EventFiltersState } from "@/features/events/types";
import { useActiveCity } from "@/hooks/useActiveCity";
import { useBannerSlots } from "@/hooks/useBannerSlots";

interface CategoriaDetalleContentProps {
  category: Category;
}

function CategoriaVacia({ categoryName, cityName }: { categoryName: string; cityName?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-surface-4 bg-surface-2 px-6 py-16 text-center">
      <CalendarX className="h-9 w-9 text-ink-5" aria-hidden />
      <p className="text-sm font-bold text-ink-3">
        No hay eventos de {categoryName} en {cityName ?? "tu ciudad"} por ahora.
      </p>
      <p className="text-xs text-ink-4">Revisá otras categorías o volvé pronto.</p>
      <Link
        href="/categorias"
        className="mt-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
      >
        Ver todas las categorías
      </Link>
    </div>
  );
}

/** Etapa 13a — eventos de una categoría. Reutiliza EventList + los filtros de
 * momento/fecha del home (sin el filtro de categoría, ya fijado por la ruta).
 * Etapa 13b — banners de la categoría (BANS_CAT[key]/ADS_GRID_CAT[key] en
 * seSALE.html, ver verCat()): banners wide específicos arriba de los
 * filtros, y tiles de grilla que reemplazan el listado mientras no haya
 * ningún filtro elegido (igual que verCat(): "Elegí un filtro para ver los
 * eventos" — antes de elegir, se muestra la publicidad de la categoría). */
export function CategoriaDetalleContent({ category }: CategoriaDetalleContentProps) {
  const { activeCity, isDetecting } = useActiveCity();
  const [filters, setFilters] = useState<EventFiltersState>({});
  const cityId = activeCity?.id ?? null;

  const wideBanners = useBannerSlots({ cityId, section: "categoria-wide", category_key: category.key });
  const gridBanners = useBannerSlots({ cityId, section: "categoria-grid", category_key: category.key });
  const gridPool = useMemo(() => gridBanners.slots.flatMap((slot) => slot.items), [gridBanners.slots]);
  const gridRotationIntervalSeconds = gridBanners.slots[0]?.rotation_interval_seconds ?? 5;

  const hasActiveFilters = Boolean(filters.moment || filters.dateFrom || filters.dateTo);
  const showGridInsteadOfList = !hasActiveFilters && !gridBanners.isLoading && gridPool.length > 0;

  const effectiveFilters: EventFiltersState = {
    ...filters,
    category: category.key,
    cityId: activeCity?.id,
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-black tracking-tight text-foreground">
          {category.emoji ? `${category.emoji} ` : ""}
          {category.name}
        </h1>
        <p className="text-sm text-ink-4">
          Eventos de {category.name} en {activeCity?.name ?? "tu ciudad"}
        </p>
      </header>

      {/* Banners específicos de la categoría — sin placeholder si no hay
       * ninguno cargado (a diferencia de home/gastronomía/CategoriasContent):
       * es normal que una categoría todavía no tenga anunciantes propios. */}
      {wideBanners.isLoading ? (
        <div className="flex flex-col gap-2" data-testid="categoria-det-bans-loading">
          <Skeleton className="aspect-[3.2/1] w-full rounded-xl md:aspect-[3.88/1]" />
        </div>
      ) : (
        wideBanners.slots
          .filter((slot) => slot.items.length > 0)
          .map((slot) => <BannerSlot key={slot.id} slot={slot} className="mb-1" />)
      )}

      <div className="flex flex-col gap-4">
        <DateFilter filters={filters} onChange={setFilters} />

        <div className="flex flex-col gap-1.5">
          <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-brand-lime">
            <Sun className="h-3 w-3 text-primary" aria-hidden />
            ¿En qué momento?
          </p>
          <MomentPills
            value={filters.moment}
            onChange={(moment) => setFilters((f) => ({ ...f, moment }))}
          />
        </div>

        {/* Etapa "Cambios de diseño TIPO B v2.2" (punto 8): resetea los
            filtros de esta vista (momento + fecha) al estado "Todos" — no
            afecta la categoría, fijada por la ruta. */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => setFilters({})}
            className="flex w-fit items-center gap-1.5 rounded-[20px] bg-surface-5 px-[13px] py-[5px] text-[11px] font-semibold text-white hover:bg-surface-6"
          >
            <X className="h-3 w-3" aria-hidden />
            Borrar filtros
          </button>
        )}
      </div>

      {showGridInsteadOfList ? (
        <AdGridPool items={gridPool} rotationIntervalSeconds={gridRotationIntervalSeconds} />
      ) : (
        <EventList
          filters={effectiveFilters}
          enabled={!isDetecting}
          emptyState={<CategoriaVacia categoryName={category.name} cityName={activeCity?.name} />}
        />
      )}
    </div>
  );
}
