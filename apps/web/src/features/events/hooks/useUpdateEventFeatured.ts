import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateEventFeatured } from "@/features/events/services/events-api";
import type { Event, EventFeaturedUpdateInput } from "@/features/events/types";

export function useUpdateEventFeatured() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, input }: { eventId: string; input: EventFeaturedUpdateInput }) =>
      updateEventFeatured(eventId, input),
    onSuccess: (updatedEvent, { eventId }) => {
      // Actualiza en el momento las listas cacheadas (home, panel admin) para
      // reflejar el cambio sin esperar el refetch, y sincroniza con el server después.
      queryClient.setQueriesData<Event[]>({ queryKey: ["events"] }, (events) =>
        events?.map((event) => (event.id === eventId ? updatedEvent : event)),
      );
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    },
  });
}
