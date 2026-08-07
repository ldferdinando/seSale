import { useQuery } from "@tanstack/react-query";

import { fetchUsers } from "@/features/users/services/users-api";

export function useUsersList(search?: string) {
  return useQuery({
    queryKey: ["users", search ?? ""],
    queryFn: () => fetchUsers(search),
  });
}
