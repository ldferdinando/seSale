import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { useLogout } from "@/features/auth/hooks/useLogout";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

describe("useLogout", () => {
  it("clears the entire query cache so no session-scoped data lingers after logout", async () => {
    server.use(http.post(`${API_URL}/api/auth/logout`, () => new HttpResponse(null, { status: 204 })));

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // Simula datos ya cacheados de la sesión (panel admin, mis-eventos, etc.).
    queryClient.setQueryData(["current-user"], { id: "1", email: "a@a.com" });
    queryClient.setQueryData(["admin-events", {}], [{ id: "e1" }]);
    queryClient.setQueryData(["my-events"], { pending: [], approved: [], rejected: [] });

    function wrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useLogout(), { wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryData(["current-user"])).toBeUndefined();
    expect(queryClient.getQueryData(["admin-events", {}])).toBeUndefined();
    expect(queryClient.getQueryData(["my-events"])).toBeUndefined();
  });
});
