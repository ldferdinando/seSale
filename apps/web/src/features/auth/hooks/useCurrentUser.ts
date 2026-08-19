import { useQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

import { getCurrentUser } from "@/features/auth/services/auth-api";
import { getToken, subscribeToken } from "@/features/auth/lib/token-store";

export const CURRENT_USER_QUERY_KEY = ["current-user"];

function hasTokenSnapshot(): boolean {
  return getToken() !== null;
}

export function useCurrentUser() {
  // Sin access_token en memoria no hay con qué autenticar el pedido: nunca
  // puede tener éxito. Esperamos a que haya uno (login, o AuthProvider
  // terminando de restaurar la sesión en el mount) antes de consultar
  // /api/users/me — evita el 401 garantizado que antes se disparaba siempre
  // al montar, con o sin sesión.
  const hasToken = useSyncExternalStore(subscribeToken, hasTokenSnapshot, () => false);

  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: getCurrentUser,
    retry: false,
    enabled: hasToken,
  });
}
