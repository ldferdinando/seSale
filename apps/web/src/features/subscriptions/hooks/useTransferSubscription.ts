import { useMutation, useQueryClient } from "@tanstack/react-query";

import { transferSubscription } from "@/features/subscriptions/services/subscriptions-api";

export function useTransferSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, eventId, note }: { planId: string; eventId: string; note?: string }) =>
      transferSubscription(planId, eventId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-subscriptions"] });
    },
  });
}
