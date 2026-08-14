import { useQuery } from "@tanstack/react-query";

import { fetchAdminLocations } from "@/features/locations/services/locations-api";
import type { AdminLocationFilters } from "@/features/locations/types";

export function useAdminLocations(filters: AdminLocationFilters) {
  return useQuery({
    queryKey: ["admin-locations", filters],
    queryFn: () => fetchAdminLocations(filters),
    staleTime: 0,
  });
}
