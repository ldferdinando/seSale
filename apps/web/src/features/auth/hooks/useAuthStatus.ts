import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useHasToken } from "@/features/auth/hooks/useHasToken";
import { useSessionRestoring } from "@/features/auth/hooks/useSessionRestoring";
import type { User } from "@/features/auth/types";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthStatusResult {
  status: AuthStatus;
  user: User | undefined;
}

// Estado de sesión con "cargando" explícito, para cualquier pantalla que
// decida algo (redirigir a /login, mostrar "Iniciá sesión") según haya o no
// usuario. useCurrentUser solo NO alcanza: en una recarga completa el
// access_token todavía no está en memoria, la query queda enabled:false y
// por lo tanto isLoading=false + data=undefined — indistinguible de "no hay
// sesión" mientras AuthProvider sigue restaurándola con el refresh_token.
//
// "loading" mientras:
// - AuthProvider no terminó su intento de restaurar la sesión, o
// - ya hay token pero /api/users/me todavía no devolvió nada. isPending (no
//   isLoading) porque apenas aparece el token hay una vuelta de render donde
//   el fetch todavía no arrancó (isFetching=false). Se combina con hasToken
//   porque sin token la query queda isPending para siempre (enabled:false).
export function useAuthStatus(): AuthStatusResult {
  const restoringSession = useSessionRestoring();
  const hasToken = useHasToken();
  const { data: user, isPending } = useCurrentUser();

  if (restoringSession || (hasToken && isPending)) {
    return { status: "loading", user: undefined };
  }
  return { status: user ? "authenticated" : "unauthenticated", user };
}
