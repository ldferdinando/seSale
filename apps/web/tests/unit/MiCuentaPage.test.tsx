import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it } from "vitest";

import MiCuentaPage from "@/app/mi-cuenta/page";
import { clearToken, setToken } from "@/features/auth/lib/token-store";
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
  afterEach(() => {
    clearToken();
  });

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
    setToken("test-token");
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
    setToken("test-token");
    renderWithClient();

    expect(await screen.findByText(/Email verificado/i)).toBeInTheDocument();
    expect(screen.getByText(/Teléfono sin verificar/i)).toBeInTheDocument();
    expect(screen.getByText(/Identidad verificada ✓/i)).toBeInTheDocument();
  });

  it("Etapa 9d — muestra el banner de verificación con link a WhatsApp cuando is_verified=false", async () => {
    server.use(
      http.get(`${API_URL}/api/users/me`, () =>
        HttpResponse.json(
          makeUser({ is_verified: false, public_name: "El Tinglado Bar", email: "juan@sesale.com.ar" }),
        ),
      ),
    );
    setToken("test-token");
    renderWithClient();

    expect(await screen.findByText(/Contactanos por WhatsApp para verificar tu identidad/i)).toBeInTheDocument();
    expect(screen.queryByText(/Identidad verificada/i)).not.toBeInTheDocument();

    const link = screen.getByRole("link", { name: /Contactar por WhatsApp/i });
    expect(link.getAttribute("href")).toContain(encodeURIComponent("El Tinglado Bar"));
    expect(link.getAttribute("href")).toContain(encodeURIComponent("juan@sesale.com.ar"));
  });

  it("Etapa 9d — no muestra el banner de verificación cuando is_verified=true", async () => {
    server.use(
      http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(makeUser({ is_verified: true }))),
    );
    setToken("test-token");
    renderWithClient();

    await screen.findByText(/Identidad verificada ✓/i);
    expect(screen.queryByText(/Contactanos por WhatsApp para verificar tu identidad/i)).not.toBeInTheDocument();
  });

  it("sin plan activo, ofrece elegir un evento para destacar", async () => {
    server.use(http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(makeUser())));
    setToken("test-token");

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
    setToken("test-token");

    renderWithClient();

    expect(await screen.findByText("Destacado")).toBeInTheDocument();
    expect(screen.getByText("Activa")).toBeInTheDocument();
  });

  it('muestra la sección "Mis banners" con mensaje cuando no tiene banners', async () => {
    server.use(
      http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(makeUser())),
      http.get(`${API_URL}/api/users/me/banners`, () => HttpResponse.json([])),
    );
    setToken("test-token");

    renderWithClient();

    expect(await screen.findByText("Mis banners")).toBeInTheDocument();
    expect(await screen.findByText(/No tenés banners activos/i)).toBeInTheDocument();
  });
});
