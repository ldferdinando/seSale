import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { AdminAdsPanel } from "@/features/admin/components/AdminAdsPanel";
import { makeAdSlotAdmin } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminAdsPanel />
    </QueryClientProvider>,
  );
}

describe("AdminAdsPanel", () => {
  it("shows a prompt until a city is chosen", () => {
    renderWithClient();
    expect(screen.getByText(/Elegí una ciudad para ver sus banners/)).toBeInTheDocument();
  });

  it("lists slots grouped by slot_position after choosing a city", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/ad-slots`, () =>
        HttpResponse.json([
          makeAdSlotAdmin({ id: "s0", slot_position: 0 }),
          makeAdSlotAdmin({ id: "s1", slot_position: 1 }),
          makeAdSlotAdmin({ id: "s2", slot_position: 2 }),
        ]),
      ),
    );
    const user = userEvent.setup();
    renderWithClient();

    await user.click(screen.getByRole("combobox", { name: "Ciudad" }));
    await user.click(await screen.findByRole("option", { name: /General Roca/ }));

    expect(await screen.findByText("Carrusel 1")).toBeInTheDocument();
    expect(screen.getByText("Carrusel 2")).toBeInTheDocument();
    expect(screen.getByText("Carrusel 3")).toBeInTheDocument();
  });

  it("shows a single 'Banners grilla' pool card for eventos-grid, not Tile 1/Tile 2", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/ad-slots`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("section") !== "eventos-grid") return HttpResponse.json([makeAdSlotAdmin()]);
        return HttpResponse.json([
          makeAdSlotAdmin({ id: "g0", section: "eventos-grid", slot_position: 0 }),
          makeAdSlotAdmin({ id: "g1", section: "eventos-grid", slot_position: 1 }),
        ]);
      }),
    );
    const user = userEvent.setup();
    renderWithClient();

    await user.click(screen.getByRole("combobox", { name: "Ciudad" }));
    await user.click(await screen.findByRole("option", { name: /General Roca/ }));
    await user.click(screen.getByRole("combobox", { name: "Sección" }));
    await user.click(await screen.findByRole("option", { name: "Eventos (grilla)" }));

    expect(await screen.findByText("Banners grilla")).toBeInTheDocument();
    expect(screen.queryByText("Tile 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Tile 2")).not.toBeInTheDocument();
  });

  it("the create modal validates required fields before saving", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/ad-slots`, () => HttpResponse.json([makeAdSlotAdmin({ id: "s0" })])),
    );
    const user = userEvent.setup();
    renderWithClient();

    await user.click(screen.getByRole("combobox", { name: "Ciudad" }));
    await user.click(await screen.findByRole("option", { name: /General Roca/ }));

    await user.click(await screen.findByRole("button", { name: /Agregar banner/ }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Elegí un anunciante")).toBeInTheDocument();
  });
});
