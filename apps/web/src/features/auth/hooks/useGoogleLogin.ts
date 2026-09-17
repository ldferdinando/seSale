import { useMutation, useQueryClient } from "@tanstack/react-query";

import { CURRENT_USER_QUERY_KEY } from "@/features/auth/hooks/useCurrentUser";
import { setToken } from "@/features/auth/lib/token-store";
import { googleLogin } from "@/features/auth/services/auth-api";

export function useGoogleLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credential: string) => googleLogin({ credential }),
    onSuccess: async (data) => {
      setToken(data.access_token);
      await queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
  });
}
