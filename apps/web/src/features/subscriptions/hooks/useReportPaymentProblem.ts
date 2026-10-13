import { useMutation, useQueryClient } from "@tanstack/react-query";

import { reportPaymentProblem } from "@/features/subscriptions/services/subscriptions-api";

export function useReportPaymentProblem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ subscriptionId, note }: { subscriptionId: string; note?: string }) =>
      reportPaymentProblem(subscriptionId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-subscriptions"] });
    },
  });
}
