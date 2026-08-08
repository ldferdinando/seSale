import { useQuery } from "@tanstack/react-query";

import {
  fetchAdminSubscriptions,
  type AdminSubscriptionFilters,
} from "@/features/subscriptions/services/subscriptions-api";

export function useAdminSubscriptions(filters: AdminSubscriptionFilters = {}) {
  return useQuery({
    queryKey: ["admin-subscriptions", filters],
    queryFn: () => fetchAdminSubscriptions(filters),
  });
}
