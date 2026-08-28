"use client";

import { Search, Ticket, X } from "lucide-react";

import { DateFilter } from "@/features/events/components/DateFilter";
import type { EventFiltersState, TicketTypeFilter } from "@/features/events/types";
import { cn } from "@/lib/utils";

interface EventFiltersProps {
  filters: EventFiltersState;
  onChange: (filters: EventFiltersState) => void;
}

/** Etapa 11b — Parte 3c: cuenta solo los filtros "de chip" (categoría, fecha,
 * momento, tipo de entrada) — la búsqueda de texto libre no cuenta como
 * filtro activo acá. */
function countActiveFilters(filters: EventFiltersState): number {
  return [filters.category, filters.dateFrom || filters.dateTo, filters.moment, filters.ticketType].filter(
    Boolean,
  ).length;
}

const TICKET_TYPE_OPTIONS: { value: TicketTypeFilter | undefined; label: string }[] = [
  { value: undefined, label: "Todos" },
  { value: "gratis", label: "Gratis" },
  { value: "pago", label: "Pago" },
];

export function EventFilters({ filters, onChange }: EventFiltersProps) {
  function clearAllFilters() {
    onChange({
      ...filters,
      category: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      moment: undefined,
      ticketType: undefined,
    });
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

      {/* Etapa 12b — filtro de tipo de entrada. "Pago" incluye eventos con
          anticipo (lo resuelve el backend). */}
      <div className="flex flex-col gap-1.5">
        <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-4">
          <Ticket className="h-3 w-3 text-primary" aria-hidden />
          Tipo de entrada
        </p>
        <div className="flex gap-2" role="group" aria-label="Tipo de entrada">
          {TICKET_TYPE_OPTIONS.map((option) => {
            const active = (filters.ticketType ?? undefined) === option.value;
            return (
              <button
                key={option.label}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ ...filters, ticketType: option.value })}
                className={cn(
                  "flex flex-1 items-center justify-center rounded-full border px-3 py-2 text-xs font-bold transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-ink-2",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

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
