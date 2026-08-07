import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createUserByAdmin } from "@/features/users/services/users-api";
import type { AdminUserCreateInput } from "@/features/users/types";

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminUserCreateInput) => createUserByAdmin(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
