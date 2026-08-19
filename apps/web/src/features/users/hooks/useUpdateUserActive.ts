import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateUserActive } from "@/features/users/services/users-api";

export function useUpdateUserActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) => updateUserActive(userId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
