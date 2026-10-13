import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { MyEventsView } from "@/features/events/components/MyEventsView";
import { clearToken, setToken } from "@/features/auth/lib/token-store";
import { makeEvent, makeSubscription, makeUser } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MyEventsView />
    </QueryClientProvider>,
  );
}

function mockLoggedIn() {
  server.use(http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(makeUser())));
  setToken("test-token");
}

describe("MyEventsView", () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearToken();
  });

  it("prompts to log in when there is no active session", async () => {
    renderWithClient();

    expect(await screen.findByText(/Iniciá sesión para ver tus eventos/i)).toBeInTheDocument();
  });

  it("shows the three status groups and defaults to pending when logged in", async () => {
    mockLoggedIn();
    renderWithClient();

    expect(await screen.findByText("Noche de Rock Nacional")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Pendientes" })).toHaveAttribute("aria-selected", "true");
  });

  it("switches groups and shows an empty state", async () => {
    mockLoggedIn();
    server.use(
      http.get(`${API_URL}/api/events/mine`, () =>
        HttpResponse.json({
          pending: [makeEvent({ status: "pending" })],
          approved: [],
          rejected: [],
        }),
      ),
    );
    const user = userEvent.setup();
    renderWithClient();

    await screen.findByText("Noche de Rock Nacional");

    await user.click(screen.getByRole("tab", { name: "Aprobados" }));

    expect(await screen.findByText("No tenés eventos en este estado.")).toBeInTheDocument();
  });

  it("el organizador puede eliminar su evento con confirmación y desaparece del listado", async () => {
    mockLoggedIn();
    let deleted = false;
    let deletedId: string | null = null;
    server.use(
      http.get(`${API_URL}/api/events/mine`, () =>
        HttpResponse.json({
          pending: deleted ? [] : [makeEvent({ id: "evt-1", status: "pending" })],
          approved: [],
          rejected: [],
        }),
      ),
      http.delete(`${API_URL}/api/events/:id`, ({ params }) => {
        deletedId = String(params.id);
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithClient();

    await user.click(await screen.findByRole("button", { name: "Eliminar Noche de Rock Nacional" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("¿Seguro que querés eliminar este evento?");
    expect(dialog).toHaveTextContent("Esta acción no se puede deshacer");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText("El evento fue eliminado.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Noche de Rock Nacional")).not.toBeInTheDocument());
    expect(deletedId).toBe("evt-1");
  });

  it("cancelar el diálogo no elimina el evento", async () => {
    mockLoggedIn();
    let deleteCalls = 0;
    server.use(
      http.delete(`${API_URL}/api/events/:id`, () => {
        deleteCalls += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithClient();

    await user.click(await screen.findByRole("button", { name: "Eliminar Noche de Rock Nacional" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Noche de Rock Nacional")).toBeInTheDocument();
    expect(deleteCalls).toBe(0);
  });

  it("shows an error state when the request fails", async () => {
    mockLoggedIn();
    server.use(http.get(`${API_URL}/api/events/mine`, () => new HttpResponse(null, { status: 500 })));
    renderWithClient();

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });

  it("does not show the pending payments section when there is nothing to resume", async () => {
    mockLoggedIn();
    renderWithClient();

    await screen.findByText("Noche de Rock Nacional");

    expect(screen.queryByText("Pagos sin completar")).not.toBeInTheDocument();
  });

  it("shows the three actions for a pending MercadoPago payment", async () => {
    mockLoggedIn();
    server.use(
      http.get(`${API_URL}/api/subscriptions/me`, () =>
        HttpResponse.json([makeSubscription({ status: "pending_payment", mp_payment_id: "pref-123" })]),
      ),
    );
    renderWithClient();

    const card = await screen.findByTestId("pending-payment-card");
    expect(screen.getByRole("heading", { name: "Pagos sin completar" })).toBeInTheDocument();
    expect(card).toHaveTextContent('Plan Destacado para "Noche de Rock Nacional"');
    expect(screen.getByRole("button", { name: "Continuar pago con MercadoPago" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cambiar a transferencia" })).toHaveAttribute(
      "href",
      "/planes/transferencia?plan_id=66666666-6666-6666-6666-666666666666&event_id=11111111-1111-1111-1111-111111111111",
    );
    expect(screen.getByRole("button", { name: "Tuve un problema, avisanos" })).toBeInTheDocument();
  });

  it("only considers the latest subscription of each event", async () => {
    mockLoggedIn();
    server.use(
      http.get(`${API_URL}/api/subscriptions/me`, () =>
        HttpResponse.json([
          // Más nueva primero: ya avisó transferencia, el pendiente de MP viejo no aplica.
          makeSubscription({ id: "new", status: "pending_approval", payment_method: "transfer" }),
          makeSubscription({ id: "old", status: "pending_payment" }),
        ]),
      ),
    );
    renderWithClient();

    await screen.findByText("Noche de Rock Nacional");

    expect(screen.queryByTestId("pending-payment-card")).not.toBeInTheDocument();
  });

  it("ignores pending transfer subscriptions", async () => {
    mockLoggedIn();
    server.use(
      http.get(`${API_URL}/api/subscriptions/me`, () =>
        HttpResponse.json([makeSubscription({ status: "pending_payment", payment_method: "transfer" })]),
      ),
    );
    renderWithClient();

    await screen.findByText("Noche de Rock Nacional");

    expect(screen.queryByTestId("pending-payment-card")).not.toBeInTheDocument();
  });
});
