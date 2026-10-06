import { useQuery } from "@tanstack/react-query";

import { fetchEvents } from "@/features/events/services/events-api";
import type { EventFiltersState } from "@/features/events/types";

interface UseEventsOptions {
  /** false pausa el fetch — ej. mientras no hay ciudad activa (Etapa 7a). Default: true. */
  enabled?: boolean;
}

export function useEvents(filters: EventFiltersState, options: UseEventsOptions = {}) {
  return useQuery({
    queryKey: ["events", filters],
    queryFn: () => fetchEvents(filters),
    enabled: options.enabled ?? true,
    // Al cambiar de ciudad (GPS que resuelve después de la default, o el
    // selector del Navbar) se mantiene el listado anterior hasta que llega el
    // nuevo, en vez de volver al skeleton. Cambios de otros filtros no.
    placeholderData: (previousData, previousQuery) => {
      const previousFilters = previousQuery?.queryKey[1] as EventFiltersState | undefined;
      return previousFilters && previousFilters.cityId !== filters.cityId ? previousData : undefined;
    },
  });
}
