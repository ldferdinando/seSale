import { fireEvent, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { CategoriaDetalleContent } from "@/app/categorias/[key]/CategoriaDetalleContent";
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
    expect(await screen.findByText(/No hay eventos/)).toBeInTheDocument();
  });
});
