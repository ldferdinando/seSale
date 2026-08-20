"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { CURRENT_USER_QUERY_KEY } from "@/features/auth/hooks/useCurrentUser";
import { setRestoringSession } from "@/features/auth/lib/session-restore-store";
import { setToken } from "@/features/auth/lib/token-store";
import { refreshSession } from "@/features/auth/services/auth-api";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    refreshSession()
      .then((data) => {
        if (cancelled) return;
        setToken(data.access_token);
        queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
      })
      .catch(() => {
        // Sin sesión activa: no hay nada que restaurar.
      })
      .finally(() => {
        // Etapa 9e — admin/layout.tsx (y guards similares) esperan esto
        // antes de decidir si redirigir por falta de sesión.
        if (!cancelled) setRestoringSession(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
