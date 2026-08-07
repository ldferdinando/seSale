import { useMutation, useQueryClient } from "@tanstack/react-query";

import { clearToken } from "@/features/auth/lib/token-store";
import { logoutUser } from "@/features/auth/services/auth-api";

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutUser,
    onSettled: () => {
      clearToken();
      // No alcanza con invalidar current-user: hay que tirar todo el cache
      // (mis-eventos, panel admin, listado de usuarios, etc.) para que nada
      // quede mostrando datos de la sesión que se acaba de cerrar. Los
      // observers activos (ej. Navbar) refetchean solos al quedarse sin data.
      queryClient.clear();
    },
  });
}
