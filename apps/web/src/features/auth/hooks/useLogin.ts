import { useMutation, useQueryClient } from "@tanstack/react-query";

import { CURRENT_USER_QUERY_KEY } from "@/features/auth/hooks/useCurrentUser";
import { setToken } from "@/features/auth/lib/token-store";
import { loginUser } from "@/features/auth/services/auth-api";
import type { LoginInput } from "@/features/auth/types";

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LoginInput) => loginUser(input),
    onSuccess: async (data) => {
      setToken(data.access_token);
      await queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
  });
}
