import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ForgotPasswordForm />
    </QueryClientProvider>,
  );
}

describe("ForgotPasswordForm", () => {
  it("shows the same success message for a registered email", async () => {
    server.use(
      http.post(`${API_URL}/api/auth/forgot-password`, () =>
        HttpResponse.json({
          message: "Si tu email está registrado, te enviaremos las instrucciones para recuperar tu contraseña.",
          reset_token: null,
        }),
      ),
    );
    const user = userEvent.setup();
    renderWithClient();

    await user.type(screen.getByLabelText(/Email/), "organizador@sesale.com.ar");
    await user.click(screen.getByRole("button", { name: "Solicitar recuperación" }));

    expect(
      await screen.findByText("Si tu email está registrado, te enviaremos las instrucciones para recuperar tu contraseña."),
    ).toBeInTheDocument();
  });

  it("shows the same success message for an unregistered email (no enumeration)", async () => {
    server.use(
      http.post(`${API_URL}/api/auth/forgot-password`, () =>
        HttpResponse.json({
          message: "Si tu email está registrado, te enviaremos las instrucciones para recuperar tu contraseña.",
          reset_token: null,
        }),
      ),
    );
    const user = userEvent.setup();
    renderWithClient();

    await user.type(screen.getByLabelText(/Email/), "no-existe@sesale.com.ar");
    await user.click(screen.getByRole("button", { name: "Solicitar recuperación" }));

    expect(
      await screen.findByText("Si tu email está registrado, te enviaremos las instrucciones para recuperar tu contraseña."),
    ).toBeInTheDocument();
  });

  it("shows the debug token when the backend includes one (staging without Resend)", async () => {
    server.use(
      http.post(`${API_URL}/api/auth/forgot-password`, () =>
        HttpResponse.json({ message: "Si tu email está registrado, recibirás instrucciones.", reset_token: "abc123" }),
      ),
    );
    const user = userEvent.setup();
    renderWithClient();

    await user.type(screen.getByLabelText(/Email/), "organizador@sesale.com.ar");
    await user.click(screen.getByRole("button", { name: "Solicitar recuperación" }));

    expect(await screen.findByText("abc123")).toBeInTheDocument();
  });

  it("does not show any token block when reset_token is null (production / Resend configured)", async () => {
    server.use(
      http.post(`${API_URL}/api/auth/forgot-password`, () =>
        HttpResponse.json({
          message: "Si tu email está registrado, te enviaremos las instrucciones para recuperar tu contraseña.",
          reset_token: null,
        }),
      ),
    );
    const user = userEvent.setup();
    renderWithClient();

    await user.type(screen.getByLabelText(/Email/), "organizador@sesale.com.ar");
    await user.click(screen.getByRole("button", { name: "Solicitar recuperación" }));

    await screen.findByText("Si tu email está registrado, te enviaremos las instrucciones para recuperar tu contraseña.");
    expect(screen.queryByText(/Token temporal/)).not.toBeInTheDocument();
  });

  it("rejects an invalid email before submitting", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await user.type(screen.getByLabelText(/Email/), "no-es-un-email");
    await user.click(screen.getByRole("button", { name: "Solicitar recuperación" }));

    expect(await screen.findByText("Email inválido")).toBeInTheDocument();
  });
});
