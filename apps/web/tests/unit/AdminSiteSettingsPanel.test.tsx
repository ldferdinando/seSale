import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { AdminSiteSettingsPanel } from "@/features/admin/components/AdminSiteSettingsPanel";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminSiteSettingsPanel />
    </QueryClientProvider>,
  );
}

describe("AdminSiteSettingsPanel", () => {
  it("carga el alias de pago actual en el campo", async () => {
    renderWithClient();

    expect(await screen.findByLabelText("Alias de pago")).toHaveValue("sesale.pagos");
  });

  it("guarda el alias editado", async () => {
    let sentBody: unknown = null;
    server.use(
      http.patch(`${API_URL}/api/admin/site-settings`, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({ payment_alias: "nuevo.alias", updated_at: "2026-10-04T12:00:00Z" });
      }),
    );
    const user = userEvent.setup();
    renderWithClient();

    const input = await screen.findByLabelText("Alias de pago");
    await user.clear(input);
    await user.type(input, "  nuevo.alias ");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Configuración guardada.")).toBeInTheDocument();
    expect(sentBody).toEqual({ payment_alias: "nuevo.alias" });
  });

  it("vaciar el campo guarda el alias como null", async () => {
    let sentBody: unknown = null;
    server.use(
      http.patch(`${API_URL}/api/admin/site-settings`, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({ payment_alias: null, updated_at: "2026-10-04T12:00:00Z" });
      }),
    );
    const user = userEvent.setup();
    renderWithClient();

    await user.clear(await screen.findByLabelText("Alias de pago"));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(sentBody).toEqual({ payment_alias: null }));
  });

  it("muestra un error si falla el guardado", async () => {
    server.use(
      http.patch(`${API_URL}/api/admin/site-settings`, () =>
        HttpResponse.json({ detail: "Error interno" }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    renderWithClient();

    await screen.findByLabelText("Alias de pago");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("muestra un error si no se puede cargar la configuración", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/site-settings`, () => HttpResponse.json({ detail: "Error" }, { status: 500 })),
    );
    renderWithClient();

    expect(await screen.findByText("No pudimos cargar la configuración.")).toBeInTheDocument();
  });
});
