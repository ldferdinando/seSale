import { useMutation, useQueryClient } from "@tanstack/react-query";

import { activateSubscription } from "@/features/subscriptions/services/subscriptions-api";

export function useActivateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ subscriptionId, expiresAt }: { subscriptionId: string; expiresAt: string }) =>
      activateSubscription(subscriptionId, expiresAt),
    onSuccess: () => {
      // Mismo gap que useReviewSubscription.ts: esto aplica el plan Banner a
      // TODOS los eventos aprobados del organizador
      // (`_apply_plan_to_organizer_events`) — no hay un event_id puntual
      // para invalidar, así que se invalida `["events"]`/`["admin-events"]`
      // entero.
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    },
  });
}
