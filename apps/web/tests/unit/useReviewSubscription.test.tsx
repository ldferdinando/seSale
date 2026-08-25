import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

import { useActivateSubscription } from "@/features/subscriptions/hooks/useActivateSubscription";
import { useReviewSubscription } from "@/features/subscriptions/hooks/useReviewSubscription";
import { makeAdminSubscription } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function wrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useReviewSubscription (Etapa 11a — bug: plan no se reflejaba tras aprobar)", () => {
  it("invalidates events, admin-events and the specific event after approving", async () => {
    server.use(
      http.patch(`${API_URL}/api/admin/subscriptions/:id/review`, () =>
        HttpResponse.json(makeAdminSubscription({ status: "active", event_id: "event-abc" })),
      ),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useReviewSubscription(), { wrapper: wrapper(queryClient) });

    result.current.mutate({ subscriptionId: "sub-1", action: "approve" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => JSON.stringify(call[0]?.queryKey));
    expect(invalidatedKeys).toContain(JSON.stringify(["admin-subscriptions"]));
    expect(invalidatedKeys).toContain(JSON.stringify(["events"]));
    expect(invalidatedKeys).toContain(JSON.stringify(["admin-events"]));
    expect(invalidatedKeys).toContain(JSON.stringify(["event", "event-abc"]));
  });
});

describe("useActivateSubscription (mismo bug, flujo Banner)", () => {
  it("invalidates events and admin-events after activating", async () => {
    server.use(
      http.patch(`${API_URL}/api/admin/subscriptions/:id/activate`, () =>
        HttpResponse.json(makeAdminSubscription({ status: "active" })),
      ),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useActivateSubscription(), { wrapper: wrapper(queryClient) });

    result.current.mutate({ subscriptionId: "sub-1", expiresAt: "2099-01-01T00:00:00Z" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => JSON.stringify(call[0]?.queryKey));
    expect(invalidatedKeys).toContain(JSON.stringify(["admin-subscriptions"]));
    expect(invalidatedKeys).toContain(JSON.stringify(["events"]));
    expect(invalidatedKeys).toContain(JSON.stringify(["admin-events"]));
  });
});
