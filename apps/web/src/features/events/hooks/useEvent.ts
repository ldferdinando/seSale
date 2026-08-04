import { useQuery } from "@tanstack/react-query";

import { fetchEventById } from "@/features/events/services/events-api";

export function useEvent(eventId: string) {
  return useQuery({
    queryKey: ["event", eventId],
    queryFn: () => fetchEventById(eventId),
    retry: false,
  });
}
