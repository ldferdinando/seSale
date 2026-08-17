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
});
