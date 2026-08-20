import { useSyncExternalStore } from "react";

import { getToken, subscribeToken } from "@/features/auth/lib/token-store";

function hasTokenSnapshot(): boolean {
  return getToken() !== null;
}

// Extraído de useCurrentUser.ts (Etapa 9e) — admin/layout.tsx lo necesita
// por separado para distinguir "todavía no hay token, pero puede llegar en
// cualquier momento (isPending de una query enabled:false)" de "ya
// resolvimos, no hay sesión". Ver comentario en AdminLayout.
export function useHasToken(): boolean {
  return useSyncExternalStore(subscribeToken, hasTokenSnapshot, () => false);
}
