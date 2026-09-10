import { screen, waitFor, within } from "@testing-library/react";
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
});
