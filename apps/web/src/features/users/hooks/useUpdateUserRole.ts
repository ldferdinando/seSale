import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateUserRole } from "@/features/users/services/users-api";

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "user" | "admin" }) => updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
