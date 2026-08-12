import { useQuery } from "@tanstack/react-query";

import { fetchEvents } from "@/features/events/services/events-api";
import type { EventFiltersState } from "@/features/events/types";

export function useEvents(filters: EventFiltersState) {
  return useQuery({
    queryKey: ["events", filters],
    queryFn: () => fetchEvents(filters),
  });
}
