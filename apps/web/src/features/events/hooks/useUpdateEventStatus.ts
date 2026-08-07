import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateEventStatus } from "@/features/events/services/events-api";
import type { EventStatus } from "@/features/events/types";

export function useUpdateEventStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: EventStatus }) =>
      updateEventStatus(eventId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["my-events"] });
    },
  });
}
