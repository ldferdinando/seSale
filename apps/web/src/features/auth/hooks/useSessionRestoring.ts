import { useSyncExternalStore } from "react";

import { isRestoringSession, subscribeRestoringSession } from "@/features/auth/lib/session-restore-store";

// true mientras AuthProvider todavía no resolvió su intento de restaurar la
// sesión (POST /api/auth/refresh al montar la app) — ver session-restore-store.ts.
export function useSessionRestoring(): boolean {
  return useSyncExternalStore(subscribeRestoringSession, isRestoringSession, () => true);
}
