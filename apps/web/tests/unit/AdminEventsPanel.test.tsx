import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { AdminEventsPanel } from "@/features/admin/components/AdminEventsPanel";
import { makeAdminEvent } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminEventsPanel />
    </QueryClientProvider>,
  );
}

describe("AdminEventsPanel", () => {
  it("lists events of every status with organizer and status badges", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/events`, () =>
        HttpResponse.json([
          makeAdminEvent({ id: "a", title: "Pendiente evento", status: "pending" }),
          makeAdminEvent({ id: "b", title: "Aprobado evento", status: "approved" }),
        ]),
      ),
    );
    renderWithClient();

    const rows = await screen.findAllByTestId("admin-event-row");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("Pendiente evento")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Pendiente")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Aprobado")).toBeInTheDocument();
  });

  it("approving an event updates its status without a full reload", async () => {
    let status: "pending" | "approved" = "pending";
    server.use(
      http.get(`${API_URL}/api/admin/events`, () =>
        HttpResponse.json([makeAdminEvent({ id: "a", title: "Evento", status })]),
      ),
      http.patch(`${API_URL}/api/events/:id/status`, async ({ request }) => {
        const body = (await request.json()) as { status: "approved" | "rejected" };
        status = body.status as "pending" | "approved";
        return HttpResponse.json(makeAdminEvent({ id: "a", title: "Evento", status }));
      }),
    );
    const user = userEvent.setup();
    renderWithClient();

    const approveButton = await screen.findByRole("button", { name: /Aprobar/ });
    await user.click(approveButton);

    await waitFor(async () => {
      const rows = await screen.findAllByTestId("admin-event-row");
      expect(within(rows[0]).getByText("Aprobado")).toBeInTheDocument();
    });
  });

  it("muestra el estado de pago del organizador cuando el evento lo tiene", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/events`, () =>
        HttpResponse.json([
          makeAdminEvent({
            id: "a",
            title: "Evento con transferencia",
            status: "pending",
            organizer_subscription: {
              status: "pending_approval",
              payment_method: "transfer",
              plan_name: "Destacado",
              plan_type: "dest",
              transfer_note: "Ya transferí",
              created_at: "2099-01-01T00:00:00Z",
              reviewed_at: null,
            },
          }),
        ]),
      ),
    );
    renderWithClient();

    const row = await screen.findByTestId("admin-event-row");
    expect(within(row).getByText(/pendiente de revisión/)).toBeInTheDocument();
    expect(within(row).getByText(/Ya transferí/)).toBeInTheDocument();
  });

  it("no muestra el estado de pago una vez que el evento ya está aprobado", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/events`, () =>
        HttpResponse.json([
          makeAdminEvent({
            id: "a",
            status: "approved",
            organizer_subscription: {
              status: "pending_approval",
              payment_method: "transfer",
              plan_name: "Destacado",
              plan_type: "dest",
              transfer_note: "Ya transferí",
              created_at: "2099-01-01T00:00:00Z",
              reviewed_at: null,
            },
          }),
        ]),
      ),
    );
    renderWithClient();

    await screen.findByTestId("admin-event-row");
    expect(screen.queryByText(/pendiente de revisión/)).not.toBeInTheDocument();
  });

  it("no muestra el estado de pago para el plan gratis", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/events`, () =>
        HttpResponse.json([
          makeAdminEvent({
            id: "a",
            status: "pending",
            organizer_subscription: {
              status: "active",
              payment_method: "mercadopago",
              plan_name: "Gratuito",
              plan_type: "gratis",
              transfer_note: null,
              created_at: "2099-01-01T00:00:00Z",
              reviewed_at: null,
            },
          }),
        ]),
      ),
    );
    renderWithClient();

    await screen.findByTestId("admin-event-row");
    expect(screen.queryByText("Gratuito")).not.toBeInTheDocument();
  });

  it("no muestra nada de pago cuando el organizador no tiene suscripción", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/events`, () =>
        HttpResponse.json([makeAdminEvent({ id: "a", organizer_subscription: null })]),
      ),
    );
    renderWithClient();

    await screen.findByTestId("admin-event-row");
    expect(screen.queryByText(/pendiente de revisión/)).not.toBeInTheDocument();
  });

  it("deleting an event requires a confirmation click", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/events`, () => HttpResponse.json([makeAdminEvent({ id: "a" })])),
    );
    const user = userEvent.setup();
    renderWithClient();

    const deleteButton = await screen.findByRole("button", { name: "Eliminar" });
    await user.click(deleteButton);

    expect(await screen.findByRole("button", { name: "Confirmar" })).toBeInTheDocument();
  });
});
