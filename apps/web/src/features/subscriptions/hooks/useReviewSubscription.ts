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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    },
  });
}
