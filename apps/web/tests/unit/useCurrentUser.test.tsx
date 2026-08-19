import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { clearToken, setToken } from "@/features/auth/lib/token-store";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

// useCurrentUser se usa en Navbar/BottomNav/paneles admin y demás — la
// consulta a GET /api/users/me se disparaba siempre al montar, tuviera o no
// un access_token en memoria (nunca puede tener éxito sin uno), dando un 401
// garantizado y ruidoso en consola tanto sin sesión como en la carrera
// contra el restore de AuthProvider en cada mount/reload.
describe("useCurrentUser", () => {
  beforeEach(() => {
    clearToken();
  });

  it("no consulta /api/users/me sin access_token en memoria (sin sesión, o restore todavía en curso)", async () => {
    const usersMeSpy = vi.fn();
    server.use(
      http.get(`${API_URL}/api/users/me`, () => {
        usersMeSpy();
        return HttpResponse.json({ id: "1", email: "a@a.com" });
      }),
    );

    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    // Le damos tiempo a que, si fuera a disparar la consulta, lo haga.
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(usersMeSpy).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("consulta /api/users/me apenas hay token en memoria", async () => {
    server.use(http.get(`${API_URL}/api/users/me`, () => HttpResponse.json({ id: "1", email: "a@a.com" })));

    const { result } = renderHook(() => useCurrentUser(), { wrapper });
    act(() => setToken("token-restaurado"));

    await waitFor(() => expect(result.current.data).toEqual({ id: "1", email: "a@a.com" }));
  });
});
