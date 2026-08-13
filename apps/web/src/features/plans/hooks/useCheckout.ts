import { useMutation } from "@tanstack/react-query";

import { checkoutPlan } from "@/features/plans/services/plans-api";

export function useCheckout() {
  return useMutation({
    mutationFn: ({ planId, eventId }: { planId: string; eventId: string }) => checkoutPlan(planId, eventId),
  });
}
