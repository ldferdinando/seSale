import { useQuery } from "@tanstack/react-query";

import { fetchMyEvents } from "@/features/events/services/events-api";

export function useMyEvents(userId: string) {
  return useQuery({
    queryKey: ["my-events", userId],
    queryFn: () => fetchMyEvents(userId),
    enabled: userId.length > 0,
  });
}
