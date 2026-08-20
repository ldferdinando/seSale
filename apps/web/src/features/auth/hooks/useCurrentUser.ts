import { useQuery } from "@tanstack/react-query";

import { getCurrentUser } from "@/features/auth/services/auth-api";
import { useHasToken } from "@/features/auth/hooks/useHasToken";

export const CURRENT_USER_QUERY_KEY = ["current-user"];

export function useCurrentUser() {
  // Sin access_token en memoria no hay con qué autenticar el pedido: nunca
  // puede tener éxito. Esperamos a que haya uno (login, o AuthProvider
  // terminando de restaurar la sesión en el mount) antes de consultar
  // /api/users/me — evita el 401 garantizado que antes se disparaba siempre
  // al montar, con o sin sesión.
  const hasToken = useHasToken();

  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: getCurrentUser,
    retry: false,
    enabled: hasToken,
  });
}
