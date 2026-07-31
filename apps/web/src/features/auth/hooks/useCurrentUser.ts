import { useQuery } from "@tanstack/react-query";

import { getCurrentUser } from "@/features/auth/services/auth-api";

export const CURRENT_USER_QUERY_KEY = ["current-user"];

export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: getCurrentUser,
    retry: false,
  });
}
