import { useQuery } from "@tanstack/react-query";

import { fetchMySubscriptions } from "@/features/subscriptions/services/subscriptions-api";

export function useMySubscriptions(enabled: boolean) {
  return useQuery({
    queryKey: ["my-subscriptions"],
    queryFn: fetchMySubscriptions,
    enabled,
  });
}
