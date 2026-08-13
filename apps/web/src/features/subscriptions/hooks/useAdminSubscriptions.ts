import { useQuery } from "@tanstack/react-query";

import {
  fetchAdminSubscriptions,
  type AdminSubscriptionFilters,
} from "@/features/subscriptions/services/subscriptions-api";

export function useAdminSubscriptions(filters: AdminSubscriptionFilters = {}) {
  return useQuery({
    queryKey: ["admin-subscriptions", filters],
    queryFn: () => fetchAdminSubscriptions(filters),
    // Igual que useMySubscriptions: el admin necesita ver de inmediato los
    // avisos de transferencia que llegan de otros usuarios, no una lista
    // cacheada hasta 60s vieja (staleTime global de QueryProvider).
    staleTime: 0,
  });
}
