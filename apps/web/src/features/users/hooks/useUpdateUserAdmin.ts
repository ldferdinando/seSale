import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateUserAdmin } from "@/features/users/services/users-api";
import type { AdminUserEditInput } from "@/features/users/types";

/** Etapa 11a — BUG 4: edición completa de un usuario desde el modal de
 * detalle del panel admin (full_name, public_name, city_id, doc_type,
 * doc_number, phone, public_whatsapp). */
export function useUpdateUserAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: AdminUserEditInput }) =>
      updateUserAdmin(userId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
