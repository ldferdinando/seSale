import { useQuery } from "@tanstack/react-query";

import { fetchLocations } from "@/features/locations/services/locations-api";
import type { LocationFilters } from "@/features/locations/types";

interface UseLocationsOptions {
  enabled?: boolean;
}

/** Lugares precargados (is_public=True) de una ciudad — selector del formulario de evento. */
export function useLocations(filters: LocationFilters, options: UseLocationsOptions = {}) {
  return useQuery({
    queryKey: ["locations", filters],
    queryFn: () => fetchLocations(filters),
    enabled: (options.enabled ?? true) && Boolean(filters.city_id),
  });
}
