import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { MyBannersSection } from "@/features/users/components/MyBannersSection";
import { makeMyAdItem } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MyBannersSection />
    </QueryClientProvider>,
  );
}

describe("MyBannersSection", () => {
  it("shows a message with a WhatsApp link when there are no banners", async () => {
    server.use(http.get(`${API_URL}/api/users/me/banners`, () => HttpResponse.json([])));

    renderWithClient();

    expect(await screen.findByText(/No tenés banners activos/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Contactanos para publicitar/ })).toHaveAttribute(
      "href",
      expect.stringContaining("wa.me"),
    );
  });

  it("lists the user's banners with section, carousel number, dates and status", async () => {
    server.use(
      http.get(`${API_URL}/api/users/me/banners`, () =>
        HttpResponse.json([
          makeMyAdItem({ section: "gastronomia", slot_position: 1, starts_at: "2026-01-01", ends_at: null, status: "active" }),
        ]),
      ),
    );

    renderWithClient();

    expect(await screen.findByText("Gastronomía · Carrusel 2")).toBeInTheDocument();
    expect(screen.getByText(/Sin fecha de vencimiento/)).toBeInTheDocument();
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });
});
