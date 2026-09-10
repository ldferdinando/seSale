"use client";

import { CalendarX, Sun } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { DateFilter } from "@/features/events/components/DateFilter";
import { EventList } from "@/features/events/components/EventList";
import { MomentPills } from "@/features/events/components/MomentPills";
import type { Category, EventFiltersState } from "@/features/events/types";
import { useActiveCity } from "@/hooks/useActiveCity";

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
 * momento/fecha del home (sin el filtro de categoría, ya fijado por la ruta). */
export function CategoriaDetalleContent({ category }: CategoriaDetalleContentProps) {
  const { activeCity, isDetecting } = useActiveCity();
  const [filters, setFilters] = useState<EventFiltersState>({});

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

      <div className="flex flex-col gap-4">
        <DateFilter filters={filters} onChange={setFilters} />

        <div className="flex flex-col gap-1.5">
          <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-4">
            <Sun className="h-3 w-3 text-primary" aria-hidden />
            ¿En qué momento?
          </p>
          <MomentPills
            value={filters.moment}
            onChange={(moment) => setFilters((f) => ({ ...f, moment }))}
          />
        </div>
      </div>

      <EventList
        filters={effectiveFilters}
        enabled={!isDetecting}
        emptyState={<CategoriaVacia categoryName={category.name} cityName={activeCity?.name} />}
      />
    </div>
  );
}
