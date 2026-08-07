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
