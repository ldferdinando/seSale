import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createPlanPrice, fetchAdminPlanPricing } from "@/features/plans/services/plans-api";
import type { PlanPriceCreateInput } from "@/features/plans/types";

export function useAdminPlanPricing() {
  return useQuery({ queryKey: ["admin-plan-pricing"], queryFn: fetchAdminPlanPricing, staleTime: 0 });
}

export function useCreatePlanPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, input }: { planId: string; input: PlanPriceCreateInput }) => createPlanPrice(planId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plan-pricing"] });
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
  });
}
