import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { MySubscriptionsSection } from "@/features/subscriptions/components/MySubscriptionsSection";
import { makeSubscription } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MySubscriptionsSection enabled />
    </QueryClientProvider>,
  );
}

describe("MySubscriptionsSection", () => {
  it("muestra el banner de revisión cuando hay una suscripción pending_approval", async () => {
    server.use(
      http.get(`${API_URL}/api/subscriptions/me`, () =>
        HttpResponse.json([
          makeSubscription({ status: "pending_approval", payment_method: "transfer", event_title: null }),
        ]),
      ),
    );

    renderWithClient();

    expect(await screen.findByText(/Tu comprobante de pago está siendo revisado/)).toBeInTheDocument();
  });

  it("el banner de revisión menciona el evento cuando la API lo manda", async () => {
    server.use(
      http.get(`${API_URL}/api/subscriptions/me`, () =>
        HttpResponse.json([
          makeSubscription({
            status: "pending_approval",
            payment_method: "transfer",
            event_title: "Peña Folclórica",
          }),
        ]),
      ),
    );

    renderWithClient();

    expect(await screen.findByText(/Peña Folclórica/)).toBeInTheDocument();
  });

  it("muestra la suscripción activa sin banner de revisión", async () => {
    server.use(
      http.get(`${API_URL}/api/subscriptions/me`, () =>
        HttpResponse.json([makeSubscription({ status: "active" })]),
      ),
    );

    renderWithClient();

    expect(await screen.findByText("Destacado")).toBeInTheDocument();
    expect(screen.queryByText(/está siendo revisado/)).not.toBeInTheDocument();
  });
});
