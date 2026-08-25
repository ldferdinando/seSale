import { useMutation, useQueryClient } from "@tanstack/react-query";

import { reviewSubscription } from "@/features/subscriptions/services/subscriptions-api";

export function useReviewSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      subscriptionId,
      action,
      adminNotes,
    }: {
      subscriptionId: string;
      action: "approve" | "reject";
      adminNotes?: string;
    }) => reviewSubscription(subscriptionId, action, adminNotes),
    onSuccess: (subscription) => {
      // Bug reportado: "creo el evento como Destacado Plus, el admin aprueba
      // la transferencia y el evento no queda como Destacado Plus" — el
      // plan SÍ se aplica en el backend (`_apply_plan_to_event`), pero acá
      // solo se invalidaba la query de Suscripciones. `["events"]`/
      // `["admin-events"]`/`["event", eventId]` seguían con el `plan`
      // viejo en cache hasta que expirara el staleTime global (60s,
      // query-client.tsx) — el admin veía "gratis" un rato después de
      // aprobar, aunque la DB ya tuviera "dest"/"pro".
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      if (subscription.event_id) {
        queryClient.invalidateQueries({ queryKey: ["event", subscription.event_id] });
      }
    },
  });
}
