import { useQuery } from "@tanstack/react-query";

import { fetchMyEvents } from "@/features/events/services/events-api";

export function useMyEvents(enabled: boolean) {
  return useQuery({
    queryKey: ["my-events"],
    queryFn: fetchMyEvents,
    enabled,
  });
}
