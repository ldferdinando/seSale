"use client";

import { Search } from "lucide-react";

import { DateFilter } from "@/features/events/components/DateFilter";
import type { EventFiltersState } from "@/features/events/types";

interface EventFiltersProps {
  filters: EventFiltersState;
  onChange: (filters: EventFiltersState) => void;
}

export function EventFilters({ filters, onChange }: EventFiltersProps) {
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
    </div>
  );
}
