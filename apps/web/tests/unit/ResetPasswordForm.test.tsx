import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient(token = "valid-token") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ResetPasswordForm token={token} />
    </QueryClientProvider>,
  );
}

describe("ResetPasswordForm", () => {
  it("validates that both passwords match", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await user.type(screen.getByLabelText("Nueva contraseña"), "Password123!");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "Distinta123!");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(await screen.findByText("Las contraseñas no coinciden")).toBeInTheDocument();
  });

  it("validates a minimum of 8 characters", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await user.type(screen.getByLabelText("Nueva contraseña"), "short");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "short");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(await screen.findByText("La contraseña debe tener al menos 8 caracteres")).toBeInTheDocument();
  });

  it("shows a success message with a link to login on successful submit", async () => {
    server.use(http.post(`${API_URL}/api/auth/reset-password`, () => HttpResponse.json({ detail: "ok" })));
    const user = userEvent.setup();
    renderWithClient();

    await user.type(screen.getByLabelText("Nueva contraseña"), "Password123!");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "Password123!");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(await screen.findByText(/actualizó correctamente/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ir a iniciar sesión/ })).toHaveAttribute("href", "/login");
  });

  it("shows the backend's error message on 400 (invalid/expired token)", async () => {
    server.use(
      http.post(`${API_URL}/api/auth/reset-password`, () =>
        HttpResponse.json(
          { detail: "El enlace de recuperación es inválido o ya expiró. Solicitá uno nuevo." },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithClient();

    await user.type(screen.getByLabelText("Nueva contraseña"), "Password123!");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "Password123!");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(
      await screen.findByText("El enlace de recuperación es inválido o ya expiró. Solicitá uno nuevo."),
    ).toBeInTheDocument();
  });
});
