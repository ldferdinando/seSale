import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http, delay } from "msw";
import { describe, expect, it } from "vitest";

import { AdSlots, AdSlotsGrid } from "@/features/events/components/AdSlots";
import { ActiveCityContext } from "@/features/cities/context/ActiveCityContext";
import { makeAdSlot } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

const FIXED_CITY = {
  id: "22222222-2222-2222-2222-222222222222",
  name: "General Roca",
  province: "Río Negro",
  emoji: "🏙️",
  is_active: true,
  sort_order: 0,
  latitude: -39.0333,
  longitude: -67.5833,
};

function renderWithFixedCity(children: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ActiveCityContext.Provider
        value={{ activeCity: FIXED_CITY, isDetecting: false, setActiveCity: () => {}, resetToDetected: () => {} }}
      >
        {children}
      </ActiveCityContext.Provider>
    </QueryClientProvider>,
  );
}

describe("AdSlots (carruseles wide, sección eventos)", () => {
  it("shows 3 wide slots once loaded", async () => {
    renderWithFixedCity(<AdSlots />);

    await waitFor(() => expect(screen.getAllByTestId("banner-slot")).toHaveLength(3));
  });

  it("shows wide-banner skeletons while the eventos slots are loading", async () => {
    server.use(
      http.get(`${API_URL}/api/ads`, async ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("section") === "eventos") {
          await delay(50);
        }
        return HttpResponse.json([]);
      }),
    );

    renderWithFixedCity(<AdSlots />);

    expect(screen.getByTestId("ad-slots-wide-loading")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId("ad-slots-wide-loading")).not.toBeInTheDocument());
  });
});

describe("AdSlotsGrid (pool único de sección eventos-grid, 2 columnas)", () => {
  it("shows 2 placeholders when the pool is empty", async () => {
    server.use(
      http.get(`${API_URL}/api/ads`, ({ request }) => {
        const url = new URL(request.url);
        const section = url.searchParams.get("section");
        if (section !== "eventos-grid") return HttpResponse.json([]);
        return HttpResponse.json([
          makeAdSlot({ section: "eventos-grid", slot_position: 0, id: "grid-slot-0", items: [] }),
          makeAdSlot({ section: "eventos-grid", slot_position: 1, id: "grid-slot-1", items: [] }),
        ]);
      }),
    );

    renderWithFixedCity(<AdSlotsGrid />);

    await waitFor(() => expect(screen.getAllByTestId("ad-grid-tile-empty")).toHaveLength(2));
  });

  it("shows 1 item and 1 placeholder when the combined pool has a single item", async () => {
    server.use(
      http.get(`${API_URL}/api/ads`, ({ request }) => {
        const url = new URL(request.url);
        const section = url.searchParams.get("section");
        if (section !== "eventos-grid") return HttpResponse.json([]);
        return HttpResponse.json([
          makeAdSlot({
            section: "eventos-grid",
            slot_position: 0,
            id: "grid-slot-0",
            items: [{ id: "a", img_url: "https://x.com/a.jpg", link_url: null, alt_text: "a", display_order: 0 }],
          }),
          makeAdSlot({ section: "eventos-grid", slot_position: 1, id: "grid-slot-1", items: [] }),
        ]);
      }),
    );

    renderWithFixedCity(<AdSlotsGrid />);

    await waitFor(() => expect(screen.getAllByTestId("ad-grid-tile")).toHaveLength(1));
    expect(screen.getAllByTestId("ad-grid-tile-empty")).toHaveLength(1);
  });

  it("pools items from every eventos-grid slot and shows 2 distinct items", async () => {
    server.use(
      http.get(`${API_URL}/api/ads`, ({ request }) => {
        const url = new URL(request.url);
        const section = url.searchParams.get("section");
        if (section !== "eventos-grid") return HttpResponse.json([]);
        return HttpResponse.json([
          makeAdSlot({
            section: "eventos-grid",
            slot_position: 0,
            id: "grid-slot-0",
            items: [{ id: "a", img_url: "https://x.com/a.jpg", link_url: null, alt_text: "a", display_order: 0 }],
          }),
          makeAdSlot({
            section: "eventos-grid",
            slot_position: 1,
            id: "grid-slot-1",
            items: [{ id: "b", img_url: "https://x.com/b.jpg", link_url: null, alt_text: "b", display_order: 0 }],
          }),
        ]);
      }),
    );

    renderWithFixedCity(<AdSlotsGrid />);

    const tiles = await waitFor(() => {
      const found = screen.getAllByTestId("ad-grid-tile");
      expect(found).toHaveLength(2);
      return found;
    });
    expect(screen.queryByTestId("ad-grid-tile-empty")).not.toBeInTheDocument();
    const alts = tiles.map((tile) => tile.querySelector("img")?.alt);
    expect(alts.sort()).toEqual(["a", "b"]);
  });

  it("shows grid skeletons while the eventos-grid slots are loading", async () => {
    server.use(
      http.get(`${API_URL}/api/ads`, async ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("section") === "eventos-grid") {
          await delay(50);
        }
        return HttpResponse.json([]);
      }),
    );

    renderWithFixedCity(<AdSlotsGrid />);

    expect(screen.getByTestId("ad-slots-grid-loading")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId("ad-slots-grid-loading")).not.toBeInTheDocument());
  });
});
