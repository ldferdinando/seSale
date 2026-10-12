import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CategoriaDetalleContent } from "@/app/categorias/[key]/CategoriaDetalleContent";
import { markListReturning, readListReturn, saveListReturn } from "@/features/events/lib/listReturn";
import type { Category } from "@/features/events/types";
import { makeEvent } from "./mocks/handlers";
import { server } from "./mocks/server";
import { renderWithActiveCity } from "./test-utils";

const API_URL = "http://localhost:8000";

const MUSICA: Category = {
  id: "cat-musica",
  key: "musica",
  name: "Música en vivo",
  emoji: "🎵",
  color: "#7F77DD",
  sort_order: 1,
};

describe("CategoriaDetalleContent (/categorias/[key])", () => {
  it("shows the category name and emoji in the header", async () => {
    renderWithActiveCity(<CategoriaDetalleContent category={MUSICA} />);

    expect(await screen.findByRole("heading", { name: /Música en vivo/ })).toHaveTextContent("🎵");
    expect(
      await screen.findByText(/Eventos de Música en vivo en General Roca/),
    ).toBeInTheDocument();
  });

  it("requests events filtered by category and active city", async () => {
    const urls: string[] = [];
    server.use(
      http.get(`${API_URL}/api/events`, ({ request }) => {
        urls.push(request.url);
        return HttpResponse.json([makeEvent()]);
      }),
    );

    renderWithActiveCity(<CategoriaDetalleContent category={MUSICA} />);

    await waitFor(() => expect(urls.some((u) => u.includes("category=musica"))).toBe(true));
    expect(urls.find((u) => u.includes("category=musica"))).toContain(
      "city_id=22222222-2222-2222-2222-222222222222",
    );
  });

  it("shows the empty state with a link back to /categorias when there are no events", async () => {
    server.use(http.get(`${API_URL}/api/events`, () => HttpResponse.json([])));

    renderWithActiveCity(<CategoriaDetalleContent category={MUSICA} />);

    expect(
      await screen.findByText(/No hay eventos de Música en vivo en General Roca por ahora/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver todas las categorías" })).toHaveAttribute(
      "href",
      "/categorias",
    );
  });

  it("applies the moment filter to the events query", async () => {
    const urls: string[] = [];
    server.use(
      http.get(`${API_URL}/api/events`, ({ request }) => {
        urls.push(request.url);
        return HttpResponse.json([]);
      }),
    );

    renderWithActiveCity(<CategoriaDetalleContent category={MUSICA} />);
    await screen.findByText(/No hay eventos/);

    fireEvent.click(screen.getByRole("button", { name: /De noche/ }));

    await waitFor(() => expect(urls.some((u) => u.includes("moment=nocturno"))).toBe(true));
  });

  it("applies a date preset to the events query", async () => {
    const urls: string[] = [];
    server.use(
      http.get(`${API_URL}/api/events`, ({ request }) => {
        urls.push(request.url);
        return HttpResponse.json([]);
      }),
    );

    renderWithActiveCity(<CategoriaDetalleContent category={MUSICA} />);
    await screen.findByText(/No hay eventos/);

    fireEvent.click(screen.getByRole("button", { name: /Este finde/ }));

    await waitFor(() => expect(urls.some((u) => u.includes("date_from"))).toBe(true));
  });

  // Etapa "Cambios de diseño TIPO B v2.2" (punto 8 — "Borrar filtros")
  describe('botón "Borrar filtros"', () => {
    it("is not shown when no filter is active", async () => {
      server.use(http.get(`${API_URL}/api/events`, () => HttpResponse.json([])));

      renderWithActiveCity(<CategoriaDetalleContent category={MUSICA} />);
      await screen.findByText(/No hay eventos/);

      expect(screen.queryByRole("button", { name: /Borrar filtros/ })).not.toBeInTheDocument();
    });

    it("appears once a filter is active and resets moment/date back to 'Todos'", async () => {
      const urls: string[] = [];
      server.use(
        http.get(`${API_URL}/api/events`, ({ request }) => {
          urls.push(request.url);
          return HttpResponse.json([]);
        }),
      );

      renderWithActiveCity(<CategoriaDetalleContent category={MUSICA} />);
      await screen.findByText(/No hay eventos/);

      fireEvent.click(screen.getByRole("button", { name: /De noche/ }));
      await waitFor(() => expect(urls.some((u) => u.includes("moment=nocturno"))).toBe(true));

      const clearButton = await screen.findByRole("button", { name: /Borrar filtros/ });
      fireEvent.click(clearButton);

      await waitFor(() => expect(urls.some((u) => !u.includes("moment="))).toBe(true));
      expect(screen.queryByRole("button", { name: /Borrar filtros/ })).not.toBeInTheDocument();
    });
  });

  // Etapa 13b — banners específicos de la categoría (BANS_CAT/ADS_GRID_CAT)

  it("requests category-wide and category-grid banners scoped to this category's key", async () => {
    const urls: string[] = [];
    server.use(
      http.get(`${API_URL}/api/ads`, ({ request }) => {
        urls.push(request.url);
        return HttpResponse.json([]);
      }),
    );

    renderWithActiveCity(<CategoriaDetalleContent category={MUSICA} />);

    await waitFor(() =>
      expect(urls.some((u) => u.includes("section=categoria-wide") && u.includes("category_key=musica"))).toBe(true),
    );
    expect(urls.some((u) => u.includes("section=categoria-grid") && u.includes("category_key=musica"))).toBe(true);
  });

  it("shows the wide banner when there is an AdItem for this category", async () => {
    server.use(
      http.get(`${API_URL}/api/ads`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("section") !== "categoria-wide") return HttpResponse.json([]);
        return HttpResponse.json([
          {
            id: "b1",
            city_id: "c1",
            section: "categoria-wide",
            slot_position: 0,
            category_key: "musica",
            rotation_mode: "sequential",
            rotation_interval_seconds: 3,
            is_active: true,
            items: [{ id: "i1", img_url: "https://example.com/a.jpg", link_url: null, alt_text: null, display_order: 0 }],
          },
        ]);
      }),
    );

    renderWithActiveCity(<CategoriaDetalleContent category={MUSICA} />);

    await waitFor(() => expect(screen.getAllByTestId("banner-slot")).toHaveLength(1));
  });

  it("does NOT show a placeholder when this category has no wide banners loaded", async () => {
    server.use(http.get(`${API_URL}/api/ads`, () => HttpResponse.json([])));

    renderWithActiveCity(<CategoriaDetalleContent category={MUSICA} />);
    await screen.findByText(/Eventos de Música en vivo/);

    expect(screen.queryByTestId("banner-slot-empty")).not.toBeInTheDocument();
    expect(screen.queryByTestId("banner-slot")).not.toBeInTheDocument();
  });

  it("shows the grid tiles instead of the event list when there are no active filters and the category-grid pool has items", async () => {
    server.use(
      http.get(`${API_URL}/api/ads`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("section") !== "categoria-grid") return HttpResponse.json([]);
        return HttpResponse.json([
          {
            id: "g1",
            city_id: "c1",
            section: "categoria-grid",
            slot_position: 0,
            category_key: "musica",
            rotation_mode: "random",
            rotation_interval_seconds: 5,
            is_active: true,
            items: [{ id: "i1", img_url: "https://example.com/a.jpg", link_url: null, alt_text: null, display_order: 0 }],
          },
        ]);
      }),
      http.get(`${API_URL}/api/events`, () => HttpResponse.json([makeEvent()])),
    );

    renderWithActiveCity(<CategoriaDetalleContent category={MUSICA} />);

    await waitFor(() => expect(screen.getByTestId("ad-grid-pool")).toBeInTheDocument());
    expect(screen.queryByText(/No hay eventos/)).not.toBeInTheDocument();
  });

  it("shows the event list (not the grid tiles) once a filter is active, even with a category-grid pool", async () => {
    server.use(
      http.get(`${API_URL}/api/ads`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("section") !== "categoria-grid") return HttpResponse.json([]);
        return HttpResponse.json([
          {
            id: "g1",
            city_id: "c1",
            section: "categoria-grid",
            slot_position: 0,
            category_key: "musica",
            rotation_mode: "random",
            rotation_interval_seconds: 5,
            is_active: true,
            items: [{ id: "i1", img_url: "https://example.com/a.jpg", link_url: null, alt_text: null, display_order: 0 }],
          },
        ]);
      }),
      http.get(`${API_URL}/api/events`, () => HttpResponse.json([])),
    );

    renderWithActiveCity(<CategoriaDetalleContent category={MUSICA} />);
    await waitFor(() => expect(screen.getByTestId("ad-grid-pool")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /De noche/ }));

    await waitFor(() => expect(screen.queryByTestId("ad-grid-pool")).not.toBeInTheDocument());
    expect(await screen.findByText("Aún no se registran eventos")).toBeInTheDocument();
  });
});

describe("CategoriaDetalleContent — chip 'Todos' y sin resultados", () => {
  it("renders the 'Todos' date chip selected by default and shows the empty legend once a filter is applied", async () => {
    server.use(http.get(`${API_URL}/api/events`, () => HttpResponse.json([])));

    renderWithActiveCity(<CategoriaDetalleContent category={MUSICA} />);

    const group = screen.getByRole("group", { name: "¿Cuándo?" });
    const todos = within(group).getByRole("button", { name: "Todos" });
    expect(todos).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(within(group).getByRole("button", { name: /Mañana/ }));
    expect(todos).toHaveAttribute("aria-pressed", "false");
    expect(await screen.findByText("Aún no se registran eventos")).toBeInTheDocument();
  });
});

/** El ancla de resultados queda "debajo" del viewport (jsdom da top 0 a
 * todo, que se interpretaría como "ya está viendo los resultados"). */
function placeAnchorBelowViewport(anchor: HTMLElement) {
  const scrollIntoView = vi.fn();
  anchor.getBoundingClientRect = () => ({ top: 900 }) as DOMRect;
  anchor.scrollIntoView = scrollIntoView;
  return scrollIntoView;
}

describe("CategoriaDetalleContent — scroll a resultados y volver desde el detalle", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState(null, "", "/categorias/musica");
  });

  it("smooth-scrolls to the results when any filter changes (fecha, momento, entrada)", async () => {
    server.use(http.get(`${API_URL}/api/events`, () => HttpResponse.json([])));
    renderWithActiveCity(<CategoriaDetalleContent category={MUSICA} />);
    const scrollIntoView = placeAnchorBelowViewport(screen.getByTestId("categoria-results-anchor"));

    fireEvent.click(screen.getByRole("button", { name: /De noche/ }));
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" }));

    scrollIntoView.mockClear();
    fireEvent.click(within(screen.getByRole("group", { name: "¿Cuándo?" })).getByRole("button", { name: /Mañana/ }));
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));

    scrollIntoView.mockClear();
    fireEvent.click(within(screen.getByRole("group", { name: "Tipo de entrada" })).getByRole("button", { name: "Gratis" }));
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
  });

  it("does not scroll on first load", async () => {
    renderWithActiveCity(<CategoriaDetalleContent category={MUSICA} />);
    const scrollIntoView = placeAnchorBelowViewport(screen.getByTestId("categoria-results-anchor"));
    await new Promise((r) => setTimeout(r, 250));
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("saves the filters + scroll position when opening an event", async () => {
    server.use(http.get(`${API_URL}/api/events`, () => HttpResponse.json([makeEvent({ id: "ev-1" })])));
    renderWithActiveCity(<CategoriaDetalleContent category={MUSICA} />);

    fireEvent.click(screen.getByRole("button", { name: /De noche/ }));
    const link = await screen.findByTestId("event-card-link");
    link.addEventListener("click", (e) => e.preventDefault());
    fireEvent.click(link);

    expect(readListReturn()).toEqual({
      path: "/categorias/musica",
      scrollY: window.scrollY,
      state: { moment: "nocturno" },
    });
  });

  it("restores the filters and the scroll position when coming back from the event", async () => {
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
    Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: 5000 });
    const urls: string[] = [];
    server.use(
      http.get(`${API_URL}/api/events`, ({ request }) => {
        urls.push(request.url);
        return HttpResponse.json([makeEvent()]);
      }),
    );
    saveListReturn("/categorias/musica", 1800, { moment: "nocturno" });
    markListReturning("/categorias/musica");

    try {
      renderWithActiveCity(<CategoriaDetalleContent category={MUSICA} />);

      await waitFor(() => expect(urls.some((u) => u.includes("moment=nocturno"))).toBe(true));
      await waitFor(() => expect(scrollTo).toHaveBeenCalledWith({ top: 1800, behavior: "instant" }));
    } finally {
      Reflect.deleteProperty(document.documentElement, "scrollHeight");
    }
  });

  it("does not restore when entering the category normally (no return mark)", async () => {
    const urls: string[] = [];
    server.use(
      http.get(`${API_URL}/api/events`, ({ request }) => {
        urls.push(request.url);
        return HttpResponse.json([]);
      }),
    );
    saveListReturn("/categorias/musica", 1800, { moment: "nocturno" });

    renderWithActiveCity(<CategoriaDetalleContent category={MUSICA} />);

    await waitFor(() => expect(urls.some((u) => u.includes("category=musica"))).toBe(true));
    expect(urls.some((u) => u.includes("moment="))).toBe(false);
  });
});
