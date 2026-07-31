import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <RegisterForm />
    </QueryClientProvider>,
  );
}

describe("RegisterForm", () => {
  it("renders the private and public data blocks", () => {
    renderWithClient();

    expect(screen.getByText("Datos privados")).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre real/)).toBeInTheDocument();
    expect(screen.getByText("Datos públicos")).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre público/)).toBeInTheDocument();
  });

  it("shows validation errors when submitting an empty form", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(await screen.findByText("Email inválido")).toBeInTheDocument();
    expect(screen.getByText("La contraseña debe tener al menos 8 caracteres")).toBeInTheDocument();
    expect(screen.getByText("El nombre real es obligatorio")).toBeInTheDocument();
    expect(screen.getByText("El nombre público es obligatorio")).toBeInTheDocument();
  });

  it("registers successfully and redirects to login", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await user.type(screen.getByLabelText(/Email/), "nuevo@sesale.com.ar");
    await user.type(screen.getByLabelText(/Contraseña/), "Password123!");
    await user.type(screen.getByLabelText(/Nombre real/), "Nueva Persona");
    await user.type(screen.getByLabelText(/Nombre público/), "Nueva Persona Público");

    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
  });

  it("shows an error message when the email is already registered", async () => {
    server.use(
      http.post(`${API_URL}/api/auth/register`, () =>
        HttpResponse.json({ detail: "El email ya está registrado" }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    renderWithClient();

    await user.type(screen.getByLabelText(/Email/), "existente@sesale.com.ar");
    await user.type(screen.getByLabelText(/Contraseña/), "Password123!");
    await user.type(screen.getByLabelText(/Nombre real/), "Nueva Persona");
    await user.type(screen.getByLabelText(/Nombre público/), "Nueva Persona Público");

    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(await screen.findByText("El email ya está registrado")).toBeInTheDocument();
  });
});
