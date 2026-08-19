import { screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import HomePage from "@/app/page";
import { server } from "./mocks/server";
import { renderWithActiveCity } from "./test-utils";

const API_URL = "http://localhost:8000";

describe("HomePage", () => {
  it("does not fetch events until the active city is detected, then filters by city_id", async () => {
    // Nota: TodayBanner también consulta /api/events (sin city_id, filtro de
    // "hoy" propio) — se filtran acá los requests que trae EventList (los
    // únicos gateados por `enabled`/isDetecting).
    const requestedUrls: string[] = [];
    server.use(
      http.get(`${API_URL}/api/events`, ({ request }) => {
        requestedUrls.push(request.url);
        return HttpResponse.json([]);
      }),
    );

    renderWithActiveCity(<HomePage />);

    // Mientras se detecta la ciudad, el skeleton de EventList está visible.
    expect(screen.getByTestId("event-list-loading")).toBeInTheDocument();
    expect(requestedUrls.some((url) => url.includes("city_id"))).toBe(false);

    await waitFor(() =>
      expect(requestedUrls.some((url) => url.includes("city_id"))).toBe(true),
    );
    const eventListRequest = requestedUrls.find((url) => url.includes("city_id"));
    expect(eventListRequest).toContain("city_id=22222222-2222-2222-2222-222222222222");
  });

  it("shows the 3 eventos banner slots once the city is detected", async () => {
    renderWithActiveCity(<HomePage />);

    await waitFor(() => expect(screen.getAllByTestId("banner-slot").length).toBeGreaterThanOrEqual(3));
  });

  it("renders the eventos-grid tiles after the events list, not next to the wide carousels", async () => {
    renderWithActiveCity(<HomePage />);

    await waitFor(() => expect(screen.getAllByTestId("banner-slot")).toHaveLength(3));
    const eventCard = await screen.findByTestId("event-card");

    // El pool de eventos-grid (2 columnas: ad-grid-tile o ad-grid-tile-empty)
    // debe venir después del listado de eventos, nunca pegado a los
    // carruseles wide de arriba.
    const gridTiles = await waitFor(() => {
      const found = [...screen.queryAllByTestId("ad-grid-tile"), ...screen.queryAllByTestId("ad-grid-tile-empty")];
      expect(found).toHaveLength(2);
      return found;
    });
    for (const tile of gridTiles) {
      expect(eventCard.compareDocumentPosition(tile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });
});
