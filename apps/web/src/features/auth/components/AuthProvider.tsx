"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { CURRENT_USER_QUERY_KEY } from "@/features/auth/hooks/useCurrentUser";
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
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
