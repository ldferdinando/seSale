import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { useBannerSlots } from "@/hooks/useBannerSlots";
import { server } from "./mocks/server";
import { makeAdSlot } from "./mocks/handlers";

const API_URL = "http://localhost:8000";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useBannerSlots", () => {
  it("does not fetch when cityId is null", () => {
    const { result } = renderHook(() => useBannerSlots({ cityId: null, section: "eventos" }), { wrapper });

    expect(result.current.slots).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("fetches slots for the given city and section", async () => {
    server.use(
      http.get(`${API_URL}/api/ads`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("city_id")).toBe("city-1");
        expect(url.searchParams.get("section")).toBe("eventos");
        return HttpResponse.json([makeAdSlot({ id: "s1" })]);
      }),
    );

    const { result } = renderHook(() => useBannerSlots({ cityId: "city-1", section: "eventos" }), { wrapper });

    await waitFor(() => expect(result.current.slots).toHaveLength(1));
    expect(result.current.slots[0].id).toBe("s1");
  });
});
