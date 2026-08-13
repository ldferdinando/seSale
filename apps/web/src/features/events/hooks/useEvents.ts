import { useQuery } from "@tanstack/react-query";

import { fetchEvents } from "@/features/events/services/events-api";
import type { EventFiltersState } from "@/features/events/types";

interface UseEventsOptions {
  /** false pausa el fetch — ej. mientras se detecta la ciudad activa (Etapa 7a). Default: true. */
  enabled?: boolean;
}

export function useEvents(filters: EventFiltersState, options: UseEventsOptions = {}) {
  return useQuery({
    queryKey: ["events", filters],
    queryFn: () => fetchEvents(filters),
    enabled: options.enabled ?? true,
  });
}
