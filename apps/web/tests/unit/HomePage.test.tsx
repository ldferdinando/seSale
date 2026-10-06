import { fireEvent, screen, waitFor, within } from "@testing-library/react";
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
  it("fetches events with the default city right away, without waiting for the GPS (PERFORMANCE_AUDIT P0-1)", async () => {
    // Nota: TodayBanner también consulta /api/events (sin city_id, filtro de
    // "hoy" propio) — se filtran acá los requests que trae EventList.
    const requestedUrls: string[] = [];
    server.use(
      http.get(`${API_URL}/api/events`, ({ request }) => {
        requestedUrls.push(request.url);
        return HttpResponse.json([]);
      }),
    );
    // GPS que nunca responde (el usuario ignora el prompt del navegador).
    const getCurrentPosition = vi.fn();
    Object.defineProperty(window.navigator, "geolocation", { value: { getCurrentPosition }, configurable: true });

    try {
      renderWithActiveCity(<HomePage />);

      await waitFor(() =>
        expect(requestedUrls.some((url) => url.includes("city_id=22222222-2222-2222-2222-222222222222"))).toBe(true),
      );
      expect(getCurrentPosition).toHaveBeenCalled();
    } finally {
      Reflect.deleteProperty(window.navigator, "geolocation");
      window.localStorage.clear();
    }
  });

  it("refetches events for the GPS city when it resolves after the default one", async () => {
    const requestedUrls: string[] = [];
    server.use(
      http.get(`${API_URL}/api/events`, ({ request }) => {
        requestedUrls.push(request.url);
        return HttpResponse.json([]);
      }),
    );
    let reportPosition: PositionCallback | undefined;
    const getCurrentPosition = vi.fn((ok: PositionCallback) => {
      reportPosition = ok;
    });
    Object.defineProperty(window.navigator, "geolocation", { value: { getCurrentPosition }, configurable: true });

    try {
      renderWithActiveCity(<HomePage />);

      await waitFor(() => expect(requestedUrls.some((url) => url.includes("city_id=2222"))).toBe(true));
      await waitFor(() => expect(getCurrentPosition).toHaveBeenCalled());

      // GPS en Cipolletti.
      reportPosition?.({ coords: { latitude: -38.94, longitude: -68.01 } } as GeolocationPosition);

      await waitFor(() =>
        expect(requestedUrls.some((url) => url.includes("city_id=cccccccc-cccc-4ccc-cccc-cccccccccccc"))).toBe(true),
      );
    } finally {
      Reflect.deleteProperty(window.navigator, "geolocation");
      window.localStorage.clear();
    }
  });

  it("shows the active city's name in the hero title, not hardcoded (Etapa 9b, bug real reportado)", async () => {
    renderWithActiveCity(<HomePage />);

    // Etapa "Labels transversales + orden de filtros" (Parte 4): TodayBanner
    // ahora también muestra la ciudad activa (tercera línea), así que el
    // nombre de la ciudad aparece más de una vez en la página.
    expect(await screen.findAllByText("General Roca")).not.toHaveLength(0);
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

  it("places the view tabs below the filters (search + day/night)", async () => {
    renderWithActiveCity(<HomePage />);

    const searchInput = await screen.findByLabelText("Buscar");
    const dayPill = screen.getByRole("button", { name: /De día/ });
    const grillaTab = screen.getByRole("button", { name: "Grilla" });

    // Buscar y los chips de momento vienen ANTES de la tab Grilla en el DOM.
    expect(searchInput.compareDocumentPosition(grillaTab) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(dayPill.compareDocumentPosition(grillaTab) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows the grid list under the 'Grilla' tab and swaps to the map under 'Mapa', never above the filters", async () => {
    renderWithActiveCity(<HomePage />);

    // Tab Grilla (default): listado visible, sin contenedor de mapa.
    await screen.findByTestId("event-card");
    expect(screen.queryByTestId("events-map-container")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mapa" }));

    // El mapa (o su skeleton) aparece DESPUÉS de las tabs, en el lugar del listado.
    const mapNode = await screen.findByTestId(
      "events-map-container",
      {},
      { timeout: 3000 },
    ).catch(() => screen.getByTestId("map-skeleton"));
    const grillaTab = screen.getByRole("button", { name: "Grilla" });
    const searchInput = screen.getByLabelText("Buscar");

    expect(grillaTab.compareDocumentPosition(mapNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(searchInput.compareDocumentPosition(mapNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByTestId("event-card")).not.toBeInTheDocument();
  });

  it("clicking 'Ahora' applies the moment filter and smooth-scrolls to the events list", async () => {
    const scrollIntoView = vi.fn();
    // jsdom no implementa scrollIntoView.
    Element.prototype.scrollIntoView = scrollIntoView;

    const requestedUrls: string[] = [];
    server.use(
      http.get(`${API_URL}/api/events`, ({ request }) => {
        requestedUrls.push(request.url);
        return HttpResponse.json([]);
      }),
    );

    renderWithActiveCity(<HomePage />);
    await screen.findAllByText("General Roca");

    fireEvent.click(screen.getByRole("button", { name: /Ahora|Qué hay hoy/i }));

    // El filtro de fecha "hoy" llega a la query del listado.
    await waitFor(() => expect(requestedUrls.some((url) => url.includes("date_from"))).toBe(true));

    // El scroll al listado se dispara tras el re-render (setTimeout 100ms).
    await waitFor(() =>
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" }),
    );
  });

  // Etapa 11b — Parte 5
  it("shows the 'ESTÁS EN EL LUGAR CORRECTO, ENTERÁTE!' legend", async () => {
    renderWithActiveCity(<HomePage />);

    expect(await screen.findByText("ESTÁS EN EL LUGAR CORRECTO, ENTERÁTE!")).toBeInTheDocument();
  });
});

describe("HomePage — sin resultados", () => {
  it('shows "Aún no se registran eventos" when the filters leave no events', async () => {
    server.use(http.get(`${API_URL}/api/events`, () => HttpResponse.json([])));

    renderWithActiveCity(<HomePage />);
    fireEvent.click(await screen.findByRole("button", { name: /De noche/ }));

    expect(await screen.findByText("Aún no se registran eventos")).toBeInTheDocument();
  });

  it("renders the 'Todos' date chip selected by default", async () => {
    renderWithActiveCity(<HomePage />);

    const group = await screen.findByRole("group", { name: "¿Cuándo?" });
    expect(within(group).getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");
  });
});
