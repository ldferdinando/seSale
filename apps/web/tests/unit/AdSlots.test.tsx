import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http, delay } from "msw";
import { describe, expect, it } from "vitest";

import { AdSlots, AdSlotsGrid } from "@/features/events/components/AdSlots";
import { ActiveCityContext } from "@/features/cities/context/ActiveCityContext";
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

describe("AdSlotsGrid (tiles cuadrados, sección eventos-grid)", () => {
  it("shows 2 grid tiles once loaded", async () => {
    renderWithFixedCity(<AdSlotsGrid />);

    await waitFor(() => expect(screen.getAllByTestId("banner-slot")).toHaveLength(2));
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
