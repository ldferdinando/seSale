import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it } from "vitest";

import { useAuthStatus } from "@/features/auth/hooks/useAuthStatus";
import { setRestoringSession } from "@/features/auth/lib/session-restore-store";
import { clearToken, setToken } from "@/features/auth/lib/token-store";
import { makeUser } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useAuthStatus", () => {
  afterEach(() => {
    clearToken();
  });

  it("es 'loading' mientras AuthProvider todavía restaura la sesión (recarga completa)", () => {
    setRestoringSession(true);
    const { result } = renderHook(() => useAuthStatus(), { wrapper });

    expect(result.current.status).toBe("loading");
    expect(result.current.user).toBeUndefined();
  });

  it("pasa a 'authenticated' cuando la restauración trae token y /api/users/me responde", async () => {
    server.use(http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(makeUser())));
    setRestoringSession(true);
    const { result } = renderHook(() => useAuthStatus(), { wrapper });

    act(() => {
      setToken("token-restaurado");
      setRestoringSession(false);
    });
    // Token presente pero query sin resultado todavía: sigue en loading.
    expect(result.current.status).toBe("loading");

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.user?.id).toBe(makeUser().id);
  });

  it("pasa a 'unauthenticated' cuando la restauración termina sin token", () => {
    setRestoringSession(true);
    const { result } = renderHook(() => useAuthStatus(), { wrapper });

    act(() => setRestoringSession(false));

    expect(result.current.status).toBe("unauthenticated");
  });

  it("es 'unauthenticated' si hay token pero /api/users/me falla (token inválido)", async () => {
    server.use(http.get(`${API_URL}/api/users/me`, () => new HttpResponse(null, { status: 401 })));
    setToken("token-vencido");
    const { result } = renderHook(() => useAuthStatus(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));
  });
});
