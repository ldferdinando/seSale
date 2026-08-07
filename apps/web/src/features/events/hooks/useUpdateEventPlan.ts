import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateEventPlan } from "@/features/events/services/events-api";
import type { Event, EventPlan } from "@/features/events/types";

export function useUpdateEventPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, plan }: { eventId: string; plan: EventPlan }) =>
      updateEventPlan(eventId, plan),
    onSuccess: (updatedEvent, { eventId }) => {
      queryClient.setQueriesData<Event[]>({ queryKey: ["events"] }, (events) =>
        events?.map((event) => (event.id === eventId ? updatedEvent : event)),
      );
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    },
  });
}
