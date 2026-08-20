import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateUserVerified } from "@/features/users/services/users-api";

export function useVerifyUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, isVerified }: { userId: string; isVerified: boolean }) =>
      updateUserVerified(userId, isVerified),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
