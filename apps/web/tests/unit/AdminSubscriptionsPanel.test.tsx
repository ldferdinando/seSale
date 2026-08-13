import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { AdminSubscriptionsPanel } from "@/features/admin/components/AdminSubscriptionsPanel";
import { makeAdminSubscription } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminSubscriptionsPanel />
    </QueryClientProvider>,
  );
}

describe("AdminSubscriptionsPanel", () => {
  it("ordena pending_approval primero y muestra el badge de método de pago", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/subscriptions`, () =>
        HttpResponse.json([
          makeAdminSubscription({
            id: "sub-active",
            status: "active",
            payment_method: "mercadopago",
            user_public_name: "Bar Activo",
          }),
          makeAdminSubscription({
            id: "sub-pending",
            status: "pending_approval",
            payment_method: "transfer",
            user_public_name: "Bar Pendiente",
            transfer_note: "Ya transferí",
          }),
        ]),
      ),
    );

    renderWithClient();

    const rows = await screen.findAllByTestId("admin-subscription-row");
    expect(rows[0]).toHaveTextContent("Bar Pendiente");
    expect(rows[0]).toHaveTextContent("Transferencia");
    expect(rows[0]).toHaveTextContent("Pendiente de revisión");
    expect(rows[0]).toHaveTextContent("Ya transferí");
    expect(rows[1]).toHaveTextContent("Bar Activo");
    expect(rows[1]).toHaveTextContent("MercadoPago");
  });

  it("el botón Aprobar pide confirmación antes de ejecutar", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/subscriptions`, () =>
        HttpResponse.json([makeAdminSubscription({ status: "pending_approval", payment_method: "transfer" })]),
      ),
    );
    const user = userEvent.setup();
    renderWithClient();

    await screen.findByTestId("admin-subscription-row");
    await user.click(screen.getByRole("button", { name: "Aprobar" }));

    const dialog = screen.getByRole("dialog", { name: "Aprobar suscripción" });
    await user.click(within(dialog).getByRole("button", { name: "Aprobar" }));

    await waitFor(() => expect(screen.getByText("Suscripción aprobada")).toBeInTheDocument());
  });

  it("el botón Rechazar abre un modal con campo de notas", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/subscriptions`, () =>
        HttpResponse.json([makeAdminSubscription({ status: "pending_approval", payment_method: "transfer" })]),
      ),
    );
    const user = userEvent.setup();
    renderWithClient();

    await screen.findByTestId("admin-subscription-row");
    await user.click(screen.getByRole("button", { name: "Rechazar" }));

    const dialog = screen.getByRole("dialog", { name: "Rechazar suscripción" });
    expect(within(dialog).getByLabelText("Motivo (opcional)")).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText("Motivo (opcional)"), "No encontramos el pago");
    await user.click(within(dialog).getByRole("button", { name: "Rechazar" }));

    await waitFor(() => expect(screen.getByText("Suscripción rechazada")).toBeInTheDocument());
  });
});
