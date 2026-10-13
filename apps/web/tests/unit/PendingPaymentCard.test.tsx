import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { PendingPaymentCard, selectResumablePayments } from "@/features/subscriptions/components/PendingPaymentCard";
import type { Subscription } from "@/features/subscriptions/types";
import { makePlan, makeSubscription } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function pendingSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return makeSubscription({ status: "pending_payment", mp_payment_id: "pref-123", ...overrides });
}

function renderCard(subscription: Subscription = pendingSubscription()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PendingPaymentCard subscription={subscription} />
    </QueryClientProvider>,
  );
}

describe("PendingPaymentCard", () => {
  it("'Continuar pago' pide un checkout para el mismo plan/evento y redirige al init_point", async () => {
    let checkoutBody: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_URL}/api/subscriptions/checkout`, async ({ request }) => {
        checkoutBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ init_point: "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-456" });
      }),
    );
    const originalLocation = window.location;
    // @ts-expect-error jsdom no permite navegación real; reemplazamos el objeto por uno espiable
    delete window.location;
    window.location = { ...originalLocation, href: "" };

    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole("button", { name: "Continuar pago con MercadoPago" }));

    await waitFor(() =>
      expect(window.location.href).toBe("https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-456"),
    );
    expect(checkoutBody).toEqual({
      plan_id: "66666666-6666-6666-6666-666666666666",
      event_id: "11111111-1111-1111-1111-111111111111",
    });

    window.location = originalLocation;
  });

  it("muestra el mensaje del backend si el checkout choca con un aviso de transferencia (409)", async () => {
    server.use(
      http.post(`${API_URL}/api/subscriptions/checkout`, () =>
        HttpResponse.json({ detail: "Ya avisaste una transferencia para este evento." }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole("button", { name: "Continuar pago con MercadoPago" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Ya avisaste una transferencia para este evento.");
  });

  it("muestra un mensaje genérico si MercadoPago falla (502)", async () => {
    server.use(
      http.post(`${API_URL}/api/subscriptions/checkout`, () =>
        HttpResponse.json({ detail: "detalle interno de MP" }, { status: 502 }),
      ),
    );
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole("button", { name: "Continuar pago con MercadoPago" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No pudimos iniciar el pago");
    expect(alert).not.toHaveTextContent("detalle interno");
  });

  it("oculta 'Continuar pago' si MercadoPago no está disponible, pero deja la transferencia", async () => {
    server.use(http.get(`${API_URL}/api/plans`, () => HttpResponse.json([makePlan({ mercadopago_available: false })])));
    renderCard();

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Continuar pago con MercadoPago" })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: "Cambiar a transferencia" })).toBeInTheDocument();
  });

  it("'Tuve un problema' envía la nota al backend y muestra la confirmación", async () => {
    let problemBody: Record<string, unknown> | null = null;
    let problemPath = "";
    server.use(
      http.post(`${API_URL}/api/subscriptions/:id/payment-problem`, async ({ params, request }) => {
        problemPath = params.id as string;
        problemBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          pendingSubscription({ problem_note: "Me rechazó la tarjeta", problem_reported_at: "2099-01-02T15:30:00Z" }),
        );
      }),
    );
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole("button", { name: "Tuve un problema, avisanos" }));
    await user.type(screen.getByLabelText(/Contanos qué pasó/i), "Me rechazó la tarjeta");
    await user.click(screen.getByRole("button", { name: "Enviar aviso" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Recibimos tu aviso");
    expect(problemPath).toBe("88888888-8888-8888-8888-888888888888");
    expect(problemBody).toEqual({ note: "Me rechazó la tarjeta" });
    expect(screen.queryByRole("button", { name: "Tuve un problema, avisanos" })).not.toBeInTheDocument();
  });

  it("muestra un error si el aviso de problema falla", async () => {
    server.use(
      http.post(`${API_URL}/api/subscriptions/:id/payment-problem`, () => new HttpResponse(null, { status: 500 })),
    );
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole("button", { name: "Tuve un problema, avisanos" }));
    await user.click(screen.getByRole("button", { name: "Enviar aviso" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos enviar tu aviso");
  });

  it("si ya avisó un problema, muestra la confirmación en vez del botón", () => {
    renderCard(pendingSubscription({ problem_reported_at: "2099-01-02T15:30:00Z" }));

    expect(screen.getByRole("status")).toHaveTextContent("Recibimos tu aviso");
    expect(screen.queryByRole("button", { name: "Tuve un problema, avisanos" })).not.toBeInTheDocument();
    // Retomar o pasarse a transferencia sigue disponible.
    expect(screen.getByRole("link", { name: "Cambiar a transferencia" })).toBeInTheDocument();
  });
});

describe("selectResumablePayments", () => {
  it("se queda con la suscripción más reciente de cada evento y solo si es un pago MP pendiente de dest/pro", () => {
    const result = selectResumablePayments([
      pendingSubscription({ id: "a", event_id: "e1" }),
      pendingSubscription({ id: "a-old", event_id: "e1" }),
      makeSubscription({ id: "b", event_id: "e2", status: "active" }),
      pendingSubscription({ id: "b-old", event_id: "e2" }),
      pendingSubscription({ id: "c", event_id: "e3", payment_method: "transfer" }),
      pendingSubscription({ id: "d", event_id: null, plan_type: "banner" }),
      pendingSubscription({ id: "e", event_id: "e4", plan_type: "pro" }),
    ]);

    expect(result.map((s) => s.id)).toEqual(["a", "e"]);
  });

  it("devuelve una lista vacía sin datos", () => {
    expect(selectResumablePayments(undefined)).toEqual([]);
  });
});
