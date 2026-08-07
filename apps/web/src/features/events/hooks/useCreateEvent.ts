import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createEvent } from "@/features/events/services/events-api";
import type { EventCreateInput } from "@/features/events/types";

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: EventCreateInput) => createEvent(input),
    onSuccess: () => {
      // Un evento nuevo (pending) también debe reflejarse en el listado
      // público cacheado y en el panel admin si ya estaban en cache.
      queryClient.invalidateQueries({ queryKey: ["my-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    },
  });
}
