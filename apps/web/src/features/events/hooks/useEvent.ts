import { useQuery } from "@tanstack/react-query";

import { fetchEventById } from "@/features/events/services/events-api";

export function useEvent(eventId: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["event", eventId],
    queryFn: () => fetchEventById(eventId),
    retry: false,
    enabled: options.enabled ?? true,
  });
}
