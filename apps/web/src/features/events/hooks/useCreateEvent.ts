import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createEvent } from "@/features/events/services/events-api";
import type { EventCreateInput } from "@/features/events/types";

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: EventCreateInput) => createEvent(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-events"] });
    },
  });
}
