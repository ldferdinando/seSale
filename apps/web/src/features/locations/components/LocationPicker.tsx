"use client";

import { CheckCircle2, MapPin, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { useLocations } from "@/features/locations/hooks/useLocations";
import type { Location } from "@/features/locations/types";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 300;

interface LocationPickerProps {
  cityId: string | undefined;
  selectedLocationId: string | undefined;
  onSelect: (location: Location) => void;
}

/** Selector de lugares precargados — Tab A del formulario de evento
 * ("Elegir lugar"). Busca por nombre/dirección con debounce de 300ms. */
export function LocationPicker({ cityId, selectedLocationId, onSelect }: LocationPickerProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [query]);

  const { data: locations, isLoading } = useLocations({
    city_id: cityId ?? "",
    search: debouncedQuery || undefined,
  });

  if (!cityId) {
    return <p className="text-xs text-ink-4">Elegí primero la ciudad del evento para ver los lugares disponibles.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5">
        <Search className="h-3.5 w-3.5 flex-shrink-0 text-ink-4" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o dirección..."
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-ink-5"
        />
      </div>

      <div className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-xl border border-border">
        {isLoading && <p className="p-3 text-xs text-ink-4">Buscando lugares...</p>}
        {!isLoading && locations?.length === 0 && (
          <p className="p-3 text-xs text-ink-4">No encontramos lugares precargados para esta búsqueda.</p>
        )}
        {!isLoading &&
          locations?.map((location) => {
            const selected = location.id === selectedLocationId;
            return (
              <button
                key={location.id}
                type="button"
                onClick={() => onSelect(location)}
                className={cn(
                  "flex items-start gap-2 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-surface-5",
                  selected && "bg-brand-pinkBg",
                )}
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" aria-hidden />
                <div className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-1 text-sm font-bold text-foreground">
                    {location.name}
                    {location.is_verified && <CheckCircle2 className="h-3 w-3 text-primary" aria-hidden />}
                  </span>
                  <span className="truncate text-xs text-ink-4">{location.address}</span>
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
}
