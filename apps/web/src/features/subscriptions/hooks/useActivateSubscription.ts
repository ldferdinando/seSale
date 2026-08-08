import { useMutation, useQueryClient } from "@tanstack/react-query";

import { activateSubscription } from "@/features/subscriptions/services/subscriptions-api";

export function useActivateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ subscriptionId, expiresAt }: { subscriptionId: string; expiresAt: string }) =>
      activateSubscription(subscriptionId, expiresAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    },
  });
}
