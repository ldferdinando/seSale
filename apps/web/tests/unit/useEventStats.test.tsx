import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { useEventStats } from "@/features/events/hooks/useEventStats";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useEventStats", () => {
  it("consumes GET /api/stats and returns the three values", async () => {
    server.use(
      http.get(`${API_URL}/api/stats`, () =>
        HttpResponse.json({ total_events: 8, total_organizers: 2, total_cities: 1 }),
      ),
    );

    const { result } = renderHook(() => useEventStats(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.eventsCount).toBe(8);
    expect(result.current.organizersCount).toBe(2);
    expect(result.current.citiesCount).toBe(1);
  });

  it("returns zeros when the API reports an empty database", async () => {
    server.use(
      http.get(`${API_URL}/api/stats`, () =>
        HttpResponse.json({ total_events: 0, total_organizers: 0, total_cities: 0 }),
      ),
    );

    const { result } = renderHook(() => useEventStats(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.eventsCount).toBe(0);
    expect(result.current.organizersCount).toBe(0);
    expect(result.current.citiesCount).toBe(0);
  });
});
