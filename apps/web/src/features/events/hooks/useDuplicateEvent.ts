import { useMutation, useQueryClient } from "@tanstack/react-query";

import { duplicateEvent } from "@/features/events/services/events-api";
import type { EventCreateInput } from "@/features/events/types";

export function useDuplicateEvent(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: EventCreateInput) => duplicateEvent(eventId, input),
    onSuccess: () => {
      // Igual que useCreateEvent: la copia nueva también tiene que
      // reflejarse en "Mis eventos", el listado público y el panel admin;
      // además el ORIGINAL cambió (puede haber recibido instance_group_id
      // por primera vez), así que invalida también su detalle.
      queryClient.invalidateQueries({ queryKey: ["my-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    },
  });
}
