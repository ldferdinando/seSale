import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import PagoExitosoPage from "@/app/planes/pago-exitoso/page";
import { makeSubscription, makeUser } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PagoExitosoPage />
    </QueryClientProvider>,
  );
}

describe("PagoExitosoPage", () => {
  it("muestra el plan activo del usuario", async () => {
    server.use(
      http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(makeUser())),
      http.get(`${API_URL}/api/subscriptions/me`, () =>
        HttpResponse.json([makeSubscription({ plan_name: "Destacado", status: "active" })]),
      ),
    );

    renderWithClient();

    expect(await screen.findByText("¡Tu plan está activo!")).toBeInTheDocument();
    expect(await screen.findByText("Destacado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Publicar un evento/i })).toHaveAttribute("href", "/publicar");
  });
});
