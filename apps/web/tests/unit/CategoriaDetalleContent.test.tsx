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
});
