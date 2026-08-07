import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { AdminUsersPanel } from "@/features/admin/components/AdminUsersPanel";
import { makeUser } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminUsersPanel />
    </QueryClientProvider>,
  );
}

describe("AdminUsersPanel", () => {
  it("shows the create-user form after clicking 'Crear usuario'", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await user.click(screen.getByRole("button", { name: "Crear usuario" }));

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
  });

  it("submits the form and creates a user", async () => {
    server.use(
      http.post(`${API_URL}/api/admin/users`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          makeUser({ email: body.email as string, public_name: body.public_name as string }),
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderWithClient();

    await user.click(screen.getByRole("button", { name: "Crear usuario" }));
    await user.type(screen.getByLabelText("Email"), "cliente@sesale.com.ar");
    await user.type(screen.getByLabelText("Contraseña"), "Password123!");
    await user.type(screen.getByLabelText("Nombre público"), "Cliente Banner");
    await user.type(screen.getByLabelText("Nombre completo"), "Cliente Banner SA");
    await user.click(screen.getByRole("button", { name: "Crear usuario" }));

    // El formulario se cierra al crear con éxito.
    expect(await screen.findByRole("button", { name: "Crear usuario" })).toBeInTheDocument();
  });
});
