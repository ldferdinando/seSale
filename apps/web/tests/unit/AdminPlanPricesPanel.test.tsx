import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { AdminPlanPricesPanel } from "@/features/admin/components/AdminPlanPricesPanel";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminPlanPricesPanel />
    </QueryClientProvider>,
  );
}

describe("AdminPlanPricesPanel", () => {
  it("muestra el precio vigente de cada plan pago", async () => {
    renderWithClient();

    const dest = await screen.findByRole("region", { name: "Destacado" });
    expect(within(dest).getByText("$3.500")).toBeInTheDocument();
    expect(within(dest).getByText(/Promo lanzamiento/)).toBeInTheDocument();

    const pro = screen.getByRole("region", { name: "Destacado Plus" });
    expect(within(pro).getByText(/Sin precio cargado/)).toBeInTheDocument();
  });

  it("muestra el historial sin repetir el precio vigente", async () => {
    renderWithClient();

    const dest = await screen.findByRole("region", { name: "Destacado" });
    const history = within(dest).getByText("Historial reciente").closest("details") as HTMLElement;
    const items = within(history).getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent("$0");
  });

  it("envía el precio nuevo y confirma", async () => {
    let sent: { url: string; body: unknown } | null = null;
    server.use(
      http.post(`${API_URL}/api/admin/plans/:id/prices`, async ({ request }) => {
        sent = { url: request.url, body: await request.json() };
        return HttpResponse.json(
          { id: "n", amount: 7000, currency: "ARS", valid_from: "2026-10-05", valid_until: null, promo_label: null, notes: null },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderWithClient();

    const pro = await screen.findByRole("region", { name: "Destacado Plus" });
    await user.type(within(pro).getByLabelText("Nuevo precio (ARS)"), "7000");
    await user.type(within(pro).getByLabelText("Etiqueta (opcional)"), "   ");
    await user.click(within(pro).getByRole("button", { name: "Actualizar precio" }));

    expect(await within(pro).findByText("Precio actualizado. Rige desde hoy.")).toBeInTheDocument();
    expect(sent).toEqual({ url: `${API_URL}/api/admin/plans/pro-plan/prices`, body: { amount: 7000, promo_label: null } });
  });

  it("valida que el monto sea un entero positivo sin llamar a la API", async () => {
    let called = false;
    server.use(
      http.post(`${API_URL}/api/admin/plans/:id/prices`, () => {
        called = true;
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderWithClient();

    const dest = await screen.findByRole("region", { name: "Destacado" });
    await user.type(within(dest).getByLabelText("Nuevo precio (ARS)"), "12.5");
    await user.click(within(dest).getByRole("button", { name: "Actualizar precio" }));

    expect(await within(dest).findByRole("alert")).toHaveTextContent("Ingresá un monto entero mayor a cero.");
    expect(called).toBe(false);
  });

  it("muestra el error del backend si falla el guardado", async () => {
    server.use(
      http.post(`${API_URL}/api/admin/plans/:id/prices`, () =>
        HttpResponse.json({ detail: "Este plan no tiene precio fijo editable" }, { status: 400 }),
      ),
    );
    const user = userEvent.setup();
    renderWithClient();

    const dest = await screen.findByRole("region", { name: "Destacado" });
    await user.type(within(dest).getByLabelText("Nuevo precio (ARS)"), "5000");
    await user.click(within(dest).getByRole("button", { name: "Actualizar precio" }));

    expect(await within(dest).findByRole("alert")).toBeInTheDocument();
  });

  it("muestra un error si no se pueden cargar los planes", async () => {
    server.use(http.get(`${API_URL}/api/admin/plans`, () => HttpResponse.json({ detail: "Error" }, { status: 500 })));
    renderWithClient();

    expect(await screen.findByText("No pudimos cargar los precios de los planes.")).toBeInTheDocument();
  });
});
