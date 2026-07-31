import { useQuery } from "@tanstack/react-query";

import { getEventMoment } from "@/features/events/lib/moment";
import { fetchEvents } from "@/features/events/services/events-api";
import type { EventFiltersState } from "@/features/events/types";

export function useEvents(filters: EventFiltersState) {
  return useQuery({
    queryKey: ["events", filters],
    queryFn: async () => {
      const events = await fetchEvents(filters);
      if (!filters.moment) return events;
      return events.filter((event) => getEventMoment(event.time) === filters.moment);
    },
  });
}
