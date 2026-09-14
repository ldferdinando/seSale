import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { CategoriasContent } from "@/app/categorias/CategoriasContent";
import { server } from "./mocks/server";
import { renderWithActiveCity } from "./test-utils";

const API_URL = "http://localhost:8000";

describe("CategoriasContent (/categorias)", () => {
  it("renders every active category sorted alphabetically by name", async () => {
    renderWithActiveCity(<CategoriasContent />);

    const cards = await screen.findAllByTestId("categoria-card");
    const names = cards.map((card) => within(card).getByRole("heading", { level: 3 }).textContent ?? "");

    // El handler de /api/categories devuelve las 13 por sort_order; la página
    // las reordena alfabéticamente.
    expect(names).toHaveLength(13);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "es")));
    // sanity: el primero alfabético es "Cine", no "Música en vivo" (sort_order 1)
    expect(names[0]).toBe("Cine");
  });

  it("shows the event count per category from /api/categories/counts", async () => {
    renderWithActiveCity(<CategoriasContent />);

    const musica = await screen.findByRole("heading", { name: "Música en vivo" });
    const card = musica.closest("[data-testid='categoria-card']") as HTMLElement;
    await waitFor(() => expect(within(card).getByText("3 eventos")).toBeInTheDocument());
  });

  it("still renders the card for a category with count 0 (shows 'Sin eventos activos')", async () => {
    renderWithActiveCity(<CategoriasContent />);

    const teatro = await screen.findByRole("heading", { name: "Teatro" });
    const card = teatro.closest("[data-testid='categoria-card']") as HTMLElement;
    await waitFor(() => expect(within(card).getByText("Sin eventos activos")).toBeInTheDocument());
  });

  it("links each card to /categorias/{key}", async () => {
    renderWithActiveCity(<CategoriasContent />);

    const musica = await screen.findByRole("heading", { name: "Música en vivo" });
    const card = musica.closest("a") as HTMLAnchorElement;
    expect(card).toHaveAttribute("href", "/categorias/musica");
  });

  it("falls back to 'Sin eventos activos' when the counts endpoint fails", async () => {
    server.use(
      http.get(`${API_URL}/api/categories/counts`, () => new HttpResponse(null, { status: 500 })),
    );

    renderWithActiveCity(<CategoriasContent />);

    const musica = await screen.findByRole("heading", { name: "Música en vivo" });
    const card = musica.closest("[data-testid='categoria-card']") as HTMLElement;
    await waitFor(() => expect(within(card).getByText("Sin eventos activos")).toBeInTheDocument());
  });

  // Etapa 13b — banners generales (BANS_CATEGORIAS)

  it("shows 2 wide BannerSlot above the grid, requesting section=categoria-wide without category_key", async () => {
    server.use(
      http.get(`${API_URL}/api/ads`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("section")).toBe("categoria-wide");
        expect(url.searchParams.has("category_key")).toBe(false);
        return HttpResponse.json([]);
      }),
    );

    renderWithActiveCity(<CategoriasContent />);

    await screen.findAllByTestId("categoria-card");
    expect(screen.queryAllByTestId("banner-slot")).toHaveLength(0);
  });

  it("shows a placeholder for each empty general banner slot (like home)", async () => {
    server.use(
      http.get(`${API_URL}/api/ads`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("section") !== "categoria-wide") return new HttpResponse(null, { status: 404 });
        return HttpResponse.json([
          { id: "b1", city_id: "c1", section: "categoria-wide", slot_position: 0, category_key: null, rotation_mode: "sequential", rotation_interval_seconds: 3, is_active: true, items: [] },
          { id: "b2", city_id: "c1", section: "categoria-wide", slot_position: 1, category_key: null, rotation_mode: "sequential", rotation_interval_seconds: 3, is_active: true, items: [] },
        ]);
      }),
    );

    renderWithActiveCity(<CategoriasContent />);

    await waitFor(() => expect(screen.getAllByTestId("banner-slot-empty")).toHaveLength(2));
  });

  // Etapa "Cambios de diseño TIPO B v2.2" (punto 7 — buscador funcional).
  describe("buscador en vivo", () => {
    it("filters the visible categories as the user types (case/accent-insensitive)", async () => {
      const user = userEvent.setup();
      renderWithActiveCity(<CategoriasContent />);

      await screen.findAllByTestId("categoria-card");
      await user.type(screen.getByTestId("categorias-search-input"), "musica");

      const cards = screen.getAllByTestId("categoria-card");
      expect(cards).toHaveLength(1);
      expect(within(cards[0]).getByRole("heading")).toHaveTextContent("Música en vivo");
    });

    it('shows "Sin resultados para tu búsqueda" when nothing matches', async () => {
      const user = userEvent.setup();
      renderWithActiveCity(<CategoriasContent />);

      await screen.findAllByTestId("categoria-card");
      await user.type(screen.getByTestId("categorias-search-input"), "zzzzz");

      expect(await screen.findByText("Sin resultados para tu búsqueda")).toBeInTheDocument();
      expect(screen.queryAllByTestId("categoria-card")).toHaveLength(0);
    });

    it("shows every category again after clearing the search", async () => {
      const user = userEvent.setup();
      renderWithActiveCity(<CategoriasContent />);

      await screen.findAllByTestId("categoria-card");
      const input = screen.getByTestId("categorias-search-input");
      await user.type(input, "musica");
      expect(screen.getAllByTestId("categoria-card")).toHaveLength(1);

      await user.clear(input);
      expect(await screen.findAllByTestId("categoria-card")).toHaveLength(13);
    });
  });
});
