import { useQuery } from "@tanstack/react-query";

import { fetchAdminEvents } from "@/features/events/services/events-api";
import type { AdminEventFilters } from "@/features/events/types";

export function useAdminEvents(filters: AdminEventFilters) {
  return useQuery({
    queryKey: ["admin-events", filters],
    queryFn: () => fetchAdminEvents(filters),
  });
}
