import { useQuery } from "@tanstack/react-query";

import { fetchAdminUsers } from "@/features/users/services/users-api";
import type { UserAdminFilters } from "@/features/users/types";

export function useAdminUsers(filters: UserAdminFilters) {
  return useQuery({
    queryKey: ["admin-users", filters],
    queryFn: () => fetchAdminUsers(filters),
    staleTime: 0,
  });
}
