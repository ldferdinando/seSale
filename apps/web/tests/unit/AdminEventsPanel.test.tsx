import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { AdminEventsPanel } from "@/features/admin/components/AdminEventsPanel";
import { makeAdminEvent } from "./mocks/handlers";
import { mockMatchMedia, setViewportWidth } from "./mocks/matchMedia";
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

  it("Etapa 11a — bug real: sigue mostrando el estado de pago pendiente aunque el evento ya esté aprobado", async () => {
    // Antes se ocultaba apenas el evento pasaba a "approved" — el admin
    // aprobaba el evento (moderación) y perdía de vista que la suscripción
    // (pago/transferencia) seguía sin revisar en la pestaña Suscripciones,
    // dejando el evento en "gratis" para siempre.
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

    const row = await screen.findByTestId("admin-event-row");
    expect(within(row).getByText(/pendiente de revisión/)).toBeInTheDocument();
  });

  it("deja de mostrar el estado de pago una vez que la suscripción ya fue aprobada (activa)", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/events`, () =>
        HttpResponse.json([
          makeAdminEvent({
            id: "a",
            status: "approved",
            plan: "dest",
            organizer_subscription: {
              status: "active",
              payment_method: "transfer",
              plan_name: "Destacado",
              plan_type: "dest",
              transfer_note: "Ya transferí",
              created_at: "2099-01-01T00:00:00Z",
              reviewed_at: "2099-01-02T00:00:00Z",
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

  it("changing the plan selector saves it immediately (Etapa 11a — BUG 3)", async () => {
    let plan: "gratis" | "dest" | "pro" = "gratis";
    server.use(
      http.get(`${API_URL}/api/admin/events`, () =>
        HttpResponse.json([makeAdminEvent({ id: "a", title: "Evento", status: "pending", plan })]),
      ),
      http.patch(`${API_URL}/api/events/:id/plan`, async ({ request }) => {
        const body = (await request.json()) as { plan: "gratis" | "dest" | "pro" };
        plan = body.plan;
        return HttpResponse.json(makeAdminEvent({ id: "a", title: "Evento", status: "pending", plan }));
      }),
    );
    const user = userEvent.setup();
    renderWithClient();

    const select = await screen.findByRole("combobox", { name: /Plan — Evento/ });
    await user.click(select);
    await user.click(await screen.findByText("Destacado Plus"));

    await waitFor(() => expect(plan).toBe("pro"));
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

  it("confirmar el borrado manda DELETE y el evento desaparece del listado", async () => {
    let deleted = false;
    let deleteCalls = 0;
    server.use(
      http.get(`${API_URL}/api/admin/events`, () =>
        HttpResponse.json(deleted ? [] : [makeAdminEvent({ id: "a", title: "Festival de Otoño" })]),
      ),
      http.delete(`${API_URL}/api/events/:id`, () => {
        deleteCalls += 1;
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithClient();

    await user.click(await screen.findByRole("button", { name: "Eliminar" }));
    await user.click(await screen.findByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(screen.queryByText("Festival de Otoño")).not.toBeInTheDocument());
    expect(deleteCalls).toBe(1);
  });

  it("un evento eliminado (con 'Mostrar eliminados') muestra el badge y no ofrece Eliminar", async () => {
    let includeDeleted: string | null = null;
    server.use(
      http.get(`${API_URL}/api/admin/events`, ({ request }) => {
        includeDeleted = new URL(request.url).searchParams.get("include_deleted");
        return HttpResponse.json(
          includeDeleted === "true"
            ? [makeAdminEvent({ id: "a", title: "Borrado", is_active: false, deleted_at: "2026-10-13T12:00:00Z" })]
            : [],
        );
      }),
    );
    const user = userEvent.setup();
    renderWithClient();

    await user.click(await screen.findByLabelText("Mostrar eliminados"));

    expect(await screen.findByText("Borrado")).toBeInTheDocument();
    expect(includeDeleted).toBe("true");
    expect(screen.getByText("Eliminado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Editar/ })).not.toBeInTheDocument();
  });

  it("un evento dado de baja (sin deleted_at) no se marca como Eliminado", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/events`, () =>
        HttpResponse.json([makeAdminEvent({ id: "a", title: "Pausado", is_active: false })]),
      ),
    );
    renderWithClient();

    expect(await screen.findByText("Dado de baja")).toBeInTheDocument();
    expect(screen.queryByText("Eliminado")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
  });

  it("muestra un error si el backend rechaza el borrado", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/events`, () => HttpResponse.json([makeAdminEvent({ id: "a" })])),
      http.delete(`${API_URL}/api/events/:id`, () => HttpResponse.json({ detail: "Evento no encontrado" }, { status: 404 })),
    );
    const user = userEvent.setup();
    renderWithClient();

    await user.click(await screen.findByRole("button", { name: "Eliminar" }));
    await user.click(await screen.findByRole("button", { name: "Confirmar" }));

    expect(await screen.findByText("No se pudo eliminar el evento. Intentá de nuevo.")).toBeInTheDocument();
  });

  describe("en viewport mobile (Etapa admin-responsive-1)", () => {
    it("muestra cada evento como tarjeta con etiqueta: valor y las acciones siguen funcionando", async () => {
      mockMatchMedia();
      setViewportWidth(375);
      let status: "pending" | "approved" = "pending";
      server.use(
        http.get(`${API_URL}/api/admin/events`, () =>
          HttpResponse.json([makeAdminEvent({ id: "a", title: "Festival de Otoño", status, plan: "gratis" })]),
        ),
        http.patch(`${API_URL}/api/events/:id/status`, async ({ request }) => {
          const body = (await request.json()) as { status: "approved" | "rejected" };
          status = body.status as "pending" | "approved";
          return HttpResponse.json(makeAdminEvent({ id: "a", title: "Festival de Otoño", status }));
        }),
      );
      const user = userEvent.setup();
      renderWithClient();

      const row = await screen.findByTestId("admin-event-row");
      expect(within(row).getByText("Festival de Otoño")).toBeInTheDocument();
      // Etiquetas de columna visibles en la tarjeta.
      expect(within(row).getByText("Evento")).toBeInTheDocument();
      expect(within(row).getByText("Organizador / Lugar / Categorías")).toBeInTheDocument();
      expect(within(row).getByText("Fecha")).toBeInTheDocument();
      expect(within(row).getByText("Plan")).toBeInTheDocument();

      const approveButton = within(row).getByRole("button", { name: /Aprobar/ });
      await user.click(approveButton);

      await waitFor(async () => {
        const updatedRow = await screen.findByTestId("admin-event-row");
        expect(within(updatedRow).getByText("Aprobado")).toBeInTheDocument();
      });
    });
  });

  describe("en viewport desktop", () => {
    it("las acciones van en una fila a todo el ancho debajo del evento (no en una columna que se corta)", async () => {
      mockMatchMedia();
      setViewportWidth(1280);
      server.use(
        http.get(`${API_URL}/api/admin/events`, () =>
          HttpResponse.json([makeAdminEvent({ id: "a", title: "Festival de Otoño", status: "pending", plan: "gratis" })]),
        ),
      );
      renderWithClient();

      const row = await screen.findByTestId("admin-event-row");
      const columnCount = screen.getAllByRole("columnheader").length;
      expect(screen.queryByRole("columnheader", { name: "Acciones" })).not.toBeInTheDocument();

      const actions = [
        within(row).getByRole("button", { name: /Aprobar/ }),
        within(row).getByRole("button", { name: /Rechazar/ }),
        within(row).getByRole("link", { name: /Ver detalle/ }),
        within(row).getByRole("link", { name: /Editar/ }),
        within(row).getByRole("button", { name: /Eliminar/ }),
      ];
      for (const action of actions) {
        expect(action.closest("td")).toHaveAttribute("colspan", String(columnCount));
      }
    });
  });
});
