import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateEvent } from "@/features/events/services/events-api";
import type { EventUpdateInput } from "@/features/events/types";

export function useUpdateEvent(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: EventUpdateInput) => updateEvent(eventId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["my-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    },
  });
}
