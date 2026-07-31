import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { LoginForm } from "@/features/auth/components/LoginForm";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LoginForm />
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
});
