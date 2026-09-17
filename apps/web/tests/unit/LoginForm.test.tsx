import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

// Evita que <Script> de next/script inserte un <script> real en el DOM
// (dedupeado globalmente por src entre tests) — GoogleLoginButton ya se
// auto-inicializa al montar si window.google está presente, sin depender
// de este componente en los tests.
vi.mock("next/script", () => ({
  default: () => null,
}));

import { LoginForm } from "@/features/auth/components/LoginForm";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient(redirect?: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LoginForm redirect={redirect} />
    </QueryClientProvider>,
  );
}

describe("LoginForm", () => {
  it("shows validation errors when submitting an empty form", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(await screen.findByText("Email inválido")).toBeInTheDocument();
    expect(screen.getByText("La contraseña es obligatoria")).toBeInTheDocument();
  });

  it("logs in successfully and redirects to mis-eventos", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await user.type(screen.getByLabelText(/Email/), "organizador@sesale.com.ar");
    await user.type(screen.getByLabelText(/Contraseña/), "Password123!");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/mis-eventos"));
  });

  it("Etapa 9e — redirige a la ruta pedida (?redirect=) en vez de mis-eventos", async () => {
    const user = userEvent.setup();
    renderWithClient("/publicar");

    await user.type(screen.getByLabelText(/Email/), "organizador@sesale.com.ar");
    await user.type(screen.getByLabelText(/Contraseña/), "Password123!");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/publicar"));
  });

  it("shows an error message on invalid credentials", async () => {
    server.use(
      http.post(`${API_URL}/api/auth/login`, () =>
        HttpResponse.json({ detail: "Credenciales inválidas" }, { status: 401 }),
      ),
    );
    const user = userEvent.setup();
    renderWithClient();

    await user.type(screen.getByLabelText(/Email/), "organizador@sesale.com.ar");
    await user.type(screen.getByLabelText(/Contraseña/), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(await screen.findByText("Credenciales inválidas")).toBeInTheDocument();
  });

  it("has a link to recover the password", () => {
    renderWithClient();

    const link = screen.getByRole("link", { name: /Olvidaste tu contraseña/ });
    expect(link).toHaveAttribute("href", "/recuperar-contrasena");
  });
});

describe("LoginForm — Google", () => {
  const originalClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = originalClientId;
    delete (window as unknown as { google?: unknown }).google;
  });

  it("renders the Google Identity Services button widget", async () => {
    const initialize = vi.fn();
    const renderButton = vi.fn((el: HTMLElement) => {
      el.textContent = "Continuar con Google";
    });
    window.google = { accounts: { id: { initialize, renderButton } } };

    renderWithClient();

    await vi.waitFor(() => expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: "test-client-id.apps.googleusercontent.com" }),
    ));
    expect(renderButton).toHaveBeenCalled();
    expect(screen.getByTestId("google-login-button")).toHaveTextContent("Continuar con Google");
  });

  it("logs in and redirects when Google's callback fires with a credential", async () => {
    let capturedCallback: ((response: { credential: string }) => void) | undefined;
    window.google = {
      accounts: {
        id: {
          initialize: vi.fn((config) => {
            capturedCallback = config.callback;
          }),
          renderButton: vi.fn(),
        },
      },
    };

    renderWithClient();

    await vi.waitFor(() => expect(capturedCallback).toBeDefined());
    await act(async () => {
      capturedCallback!({ credential: "fake-google-credential" });
    });

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/mis-eventos"));
  });

  it("shows an error message when the backend rejects the Google credential", async () => {
    server.use(
      http.post(`${API_URL}/api/auth/google`, () =>
        HttpResponse.json({ detail: "Token de Google inválido o expirado" }, { status: 401 }),
      ),
    );
    let capturedCallback: ((response: { credential: string }) => void) | undefined;
    window.google = {
      accounts: {
        id: {
          initialize: vi.fn((config) => {
            capturedCallback = config.callback;
          }),
          renderButton: vi.fn(),
        },
      },
    };

    renderWithClient();

    await vi.waitFor(() => expect(capturedCallback).toBeDefined());
    await act(async () => {
      capturedCallback!({ credential: "bad-credential" });
    });

    expect(await screen.findByText("Token de Google inválido o expirado")).toBeInTheDocument();
  });
});
