"use client";

import { Search, X } from "lucide-react";

import { DateFilter } from "@/features/events/components/DateFilter";
import type { EventFiltersState } from "@/features/events/types";

interface EventFiltersProps {
  filters: EventFiltersState;
  onChange: (filters: EventFiltersState) => void;
}

/** Etapa 11b — Parte 3c: cuenta solo los filtros "de chip" (categoría, fecha,
 * momento) — la búsqueda de texto libre no cuenta como filtro activo acá. */
function countActiveFilters(filters: EventFiltersState): number {
  return [filters.category, filters.dateFrom || filters.dateTo, filters.moment].filter(Boolean).length;
}

export function EventFilters({ filters, onChange }: EventFiltersProps) {
  function clearAllFilters() {
    onChange({ ...filters, category: undefined, dateFrom: undefined, dateTo: undefined, moment: undefined });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3.5 py-2.5">
        <Search className="h-4 w-4 flex-shrink-0 text-ink-5" aria-hidden />
        <input
          type="text"
          aria-label="Buscar"
          placeholder="Buscar evento, lugar, artista..."
          className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-ink-5"
          value={filters.search ?? ""}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
        />
      </div>

      <DateFilter filters={filters} onChange={onChange} />

      {countActiveFilters(filters) > 1 && (
        <button
          type="button"
          onClick={clearAllFilters}
          className="flex w-fit items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold text-ink-3 hover:bg-surface-5"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
