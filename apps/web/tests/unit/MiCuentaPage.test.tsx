import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import MiCuentaPage from "@/app/mi-cuenta/page";
import { makeSubscription, makeUser } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MiCuentaPage />
    </QueryClientProvider>,
  );
}

describe("MiCuentaPage", () => {
  it("prompts to log in when there is no active session", async () => {
    renderWithClient();

    expect(await screen.findByText(/Iniciá sesión para ver tu cuenta/i)).toBeInTheDocument();
  });

  it("shows the user's profile data", async () => {
    server.use(
      http.get(`${API_URL}/api/users/me`, () =>
        HttpResponse.json(makeUser({ email: "juan@sesale.com.ar", public_name: "El Tinglado Bar" })),
      ),
    );
    renderWithClient();

    expect(await screen.findByText("juan@sesale.com.ar")).toBeInTheDocument();
    expect(screen.getByText("El Tinglado Bar")).toBeInTheDocument();
  });

  it("shows verification badges according to the user's status", async () => {
    server.use(
      http.get(`${API_URL}/api/users/me`, () =>
        HttpResponse.json(makeUser({ email_verified: true, phone_verified: false, is_verified: true })),
      ),
    );
    renderWithClient();

    expect(await screen.findByText(/Email verificado/i)).toBeInTheDocument();
    expect(screen.getByText(/Teléfono sin verificar/i)).toBeInTheDocument();
    expect(screen.getByText(/Identidad verificada por seSALE/i)).toBeInTheDocument();
  });

  it("sin plan activo, ofrece elegir un evento para destacar", async () => {
    server.use(http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(makeUser())));

    renderWithClient();

    expect(await screen.findByText(/No tenés un plan activo todavía/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Elegir un evento para destacar/i })).toHaveAttribute(
      "href",
      "/mis-eventos",
    );
  });

  it("muestra las suscripciones activas del usuario", async () => {
    server.use(
      http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(makeUser())),
      http.get(`${API_URL}/api/subscriptions/me`, () =>
        HttpResponse.json([makeSubscription({ plan_name: "Destacado", status: "active" })]),
      ),
    );

    renderWithClient();

    expect(await screen.findByText("Destacado")).toBeInTheDocument();
    expect(screen.getByText("Activa")).toBeInTheDocument();
  });

  it('muestra la sección "Mis banners" con mensaje cuando no tiene banners', async () => {
    server.use(
      http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(makeUser())),
      http.get(`${API_URL}/api/users/me/banners`, () => HttpResponse.json([])),
    );

    renderWithClient();

    expect(await screen.findByText("Mis banners")).toBeInTheDocument();
    expect(await screen.findByText(/No tenés banners activos/i)).toBeInTheDocument();
  });
});
