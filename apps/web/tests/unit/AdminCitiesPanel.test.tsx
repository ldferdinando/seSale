import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { AdminCitiesPanel } from "@/features/admin/components/AdminCitiesPanel";
import { makeAdminCity } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminCitiesPanel />
    </QueryClientProvider>,
  );
}

describe("AdminCitiesPanel", () => {
  it("lists cities with active event count and coordinates", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/cities`, () =>
        HttpResponse.json([makeAdminCity({ active_events_count: 3 })]),
      ),
    );

    renderWithClient();

    expect(await screen.findByText(/General Roca/)).toBeInTheDocument();
    expect(screen.getByText("Río Negro")).toBeInTheDocument();
    expect(screen.getByText("3 eventos activos")).toBeInTheDocument();
  });

  it("shows the toggle switch reflecting is_active", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/cities`, () => HttpResponse.json([makeAdminCity({ is_active: true })])),
    );

    renderWithClient();

    const toggle = await screen.findByRole("switch", { name: "Desactivar ciudad" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("calls PATCH /api/cities/:id/toggle when the toggle is clicked", async () => {
    let toggled = false;
    server.use(
      http.get(`${API_URL}/api/admin/cities`, () => HttpResponse.json([makeAdminCity({ is_active: true })])),
      http.patch(`${API_URL}/api/cities/:id/toggle`, ({ params }) => {
        toggled = true;
        return HttpResponse.json(makeAdminCity({ id: params.id as string, is_active: false }));
      }),
    );
    const user = userEvent.setup();
    renderWithClient();

    const toggle = await screen.findByRole("switch", { name: "Desactivar ciudad" });
    await user.click(toggle);

    await waitFor(() => expect(toggled).toBe(true));
  });

  it("shows the 409 error inline without hiding the row", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/cities`, () => HttpResponse.json([makeAdminCity({ is_active: true })])),
      http.patch(`${API_URL}/api/cities/:id/toggle`, () =>
        HttpResponse.json(
          { detail: "Esta ciudad tiene 2 evento(s) activo(s). Desactivá o reasigná los eventos antes de deshabilitar la ciudad." },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithClient();

    const toggle = await screen.findByRole("switch", { name: "Desactivar ciudad" });
    await user.click(toggle);

    expect(await screen.findByRole("alert")).toHaveTextContent(/Desactivá o reasigná los eventos/);
    expect(screen.getByText(/General Roca/)).toBeInTheDocument();
  });
});
