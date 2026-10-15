import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { AdminLocationsPanel } from "@/features/admin/components/AdminLocationsPanel";
import { makeAdminLocation } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminLocationsPanel />
    </QueryClientProvider>,
  );
}

describe("AdminLocationsPanel", () => {
  it("lists locations with badges and event count", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/locations`, () =>
        HttpResponse.json([makeAdminLocation({ event_count: 3 })]),
      ),
    );

    renderWithClient();

    expect(await screen.findByText("El Tinglado Bar")).toBeInTheDocument();
    expect(screen.getByText("Av. Roca 1240")).toBeInTheDocument();
    expect(screen.getByText("Verificado")).toBeInTheDocument();
    expect(screen.getByText("Público")).toBeInTheDocument();
    expect(screen.getByText("3 eventos asociados")).toBeInTheDocument();
  });

  it("shows the 'Hacer público' action only for private locations", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/locations`, () =>
        HttpResponse.json([makeAdminLocation({ is_public: false })]),
      ),
    );

    renderWithClient();

    expect(await screen.findByRole("button", { name: /Hacer público/ })).toBeInTheDocument();
  });

  it("saves a new location with POST /api/admin/locations", async () => {
    let capturedBody: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_URL}/api/admin/locations`, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(makeAdminLocation({ name: capturedBody.name as string }), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderWithClient();

    await user.click(await screen.findByRole("button", { name: /Nuevo lugar/ }));

    await user.type(screen.getByLabelText("Nombre *"), "Bar Nuevo");
    await user.click(screen.getByRole("combobox", { name: "Ciudad" }));
    await user.click(await screen.findByRole("option", { name: /General Roca/ }));
    await user.type(screen.getByLabelText("Dirección *"), "Calle Falsa 123");

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(capturedBody).not.toBeNull());
    expect(capturedBody).toMatchObject({ name: "Bar Nuevo", address: "Calle Falsa 123" });
  });

  it("shows type chips, plan badge and a 'Destacado' button for places with types", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/locations`, () =>
        HttpResponse.json([
          makeAdminLocation({ is_gastro: true, plan: "pro", configured_plan: "pro", gastro_types: ["bar", "club"] }),
        ]),
      ),
    );

    renderWithClient();

    const row = await screen.findByTestId("admin-location-row");
    expect(await within(row).findByText("Bares")).toBeInTheDocument();
    expect(within(row).getByText("Clubes")).toBeInTheDocument();
    expect(within(row).getAllByText("Destacado Plus").length).toBeGreaterThanOrEqual(1);
    expect(within(row).getByRole("button", { name: "Destacado" })).toBeInTheDocument();
  });

  it("marks places without types as event-only and hides the 'Destacado' button", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/locations`, () => HttpResponse.json([makeAdminLocation()])),
    );

    renderWithClient();

    expect(await screen.findByText("Sin tipo · solo eventos")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Destacado" })).not.toBeInTheDocument();
  });

  it("shows an inactive badge and toggles is_active via PUT", async () => {
    let body: Record<string, unknown> | null = null;
    server.use(
      http.get(`${API_URL}/api/admin/locations`, () => HttpResponse.json([makeAdminLocation({ is_active: false })])),
      http.put(`${API_URL}/api/admin/locations/:id`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(makeAdminLocation());
      }),
    );
    const user = userEvent.setup();
    renderWithClient();

    expect(await screen.findByText("Inactivo")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Activar" }));

    await waitFor(() => expect(body).toEqual({ is_active: true }));
  });

  it("filters by grupo through the query string", async () => {
    const grupos: (string | null)[] = [];
    server.use(
      http.get(`${API_URL}/api/admin/locations`, ({ request }) => {
        grupos.push(new URL(request.url).searchParams.get("grupo"));
        return HttpResponse.json([makeAdminLocation()]);
      }),
    );
    const user = userEvent.setup();
    renderWithClient();

    await screen.findByText("El Tinglado Bar");
    await user.click(screen.getByRole("combobox", { name: "Filtrar por tipo" }));
    await user.click(await screen.findByRole("option", { name: "Espacios" }));

    await waitFor(() => expect(grupos).toContain("espacios"));
  });
});
