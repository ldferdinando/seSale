"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EVENT_CATEGORIES, type EventFiltersState } from "@/features/events/types";

const ALL_CATEGORIES = "__all__";

interface EventFiltersProps {
  filters: EventFiltersState;
  onChange: (filters: EventFiltersState) => void;
}

export function EventFilters({ filters, onChange }: EventFiltersProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-4">Filtrar por</p>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.category ?? ALL_CATEGORIES}
          onValueChange={(value) => onChange({ ...filters, category: value === ALL_CATEGORIES ? undefined : value })}
        >
          <SelectTrigger aria-label="Categoría">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>Todas las categorías</SelectItem>
            {EVENT_CATEGORIES.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <input
          type="date"
          aria-label="Desde"
          className="h-9 rounded-full border border-border bg-card px-4 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none"
          value={filters.dateFrom ?? ""}
          onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || undefined })}
        />

        <input
          type="date"
          aria-label="Hasta"
          className="h-9 rounded-full border border-border bg-card px-4 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none"
          value={filters.dateTo ?? ""}
          onChange={(e) => onChange({ ...filters, dateTo: e.target.value || undefined })}
        />
      </div>
    </div>
  );
}
