import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

import { AdminUsersPanel } from "@/features/admin/components/AdminUsersPanel";
import { makeAdminUser, makeUser } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient(onViewUserEvents = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    onViewUserEvents,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AdminUsersPanel onViewUserEvents={onViewUserEvents} />
      </QueryClientProvider>,
    ),
  };
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

  it("lists all users regardless of role or active state", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/users`, () => {
        return HttpResponse.json([
          makeAdminUser({ id: "u1", email: "organizador@sesale.com.ar", public_name: "El Tinglado Bar", role: "user" }),
          makeAdminUser({ id: "u2", email: "admin@sesale.com.ar", public_name: "Admin seSALE", role: "admin" }),
          makeAdminUser({
            id: "u3",
            email: "inactivo@sesale.com.ar",
            public_name: "Cuenta Inactiva",
            is_active: false,
          }),
        ]);
      }),
    );
    renderWithClient();

    expect(await screen.findByText("El Tinglado Bar")).toBeInTheDocument();
    expect(screen.getByText("Admin seSALE")).toBeInTheDocument();
    expect(screen.getByText("Cuenta Inactiva")).toBeInTheDocument();
  });

  it("search filter narrows the list in real time", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/users`, ({ request }) => {
        const search = new URL(request.url).searchParams.get("search");
        if (search === "Tinglado") {
          return HttpResponse.json([makeAdminUser({ id: "u1", public_name: "El Tinglado Bar" })]);
        }
        return HttpResponse.json([
          makeAdminUser({ id: "u1", public_name: "El Tinglado Bar" }),
          makeAdminUser({ id: "u2", public_name: "Admin seSALE", role: "admin" }),
        ]);
      }),
    );
    const user = userEvent.setup();
    renderWithClient();

    expect(await screen.findByText("El Tinglado Bar")).toBeInTheDocument();
    expect(screen.getByText("Admin seSALE")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Buscar usuario"), "Tinglado");

    await waitFor(() => expect(screen.queryByText("Admin seSALE")).not.toBeInTheDocument());
    expect(screen.getByText("El Tinglado Bar")).toBeInTheDocument();
  });

  it("role filter shows only users of the selected role", async () => {
    server.use(
      http.get(`${API_URL}/api/admin/users`, ({ request }) => {
        const role = new URL(request.url).searchParams.get("role");
        if (role === "admin") {
          return HttpResponse.json([makeAdminUser({ id: "u2", public_name: "Admin seSALE", role: "admin" })]);
        }
        return HttpResponse.json([
          makeAdminUser({ id: "u1", public_name: "El Tinglado Bar" }),
          makeAdminUser({ id: "u2", public_name: "Admin seSALE", role: "admin" }),
        ]);
      }),
    );
    const user = userEvent.setup();
    renderWithClient();

    expect(await screen.findByText("El Tinglado Bar")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Filtrar por rol"));
    await user.click(await screen.findByRole("option", { name: "Admins" }));

    await waitFor(() => expect(screen.queryByText("El Tinglado Bar")).not.toBeInTheDocument());
    expect(screen.getByText("Admin seSALE")).toBeInTheDocument();
  });

  it("toggling is_active calls the correct endpoint", async () => {
    let calledWith: Record<string, unknown> | null = null;
    server.use(
      http.get(`${API_URL}/api/admin/users`, () => {
        return HttpResponse.json([makeAdminUser({ id: "u1", public_name: "El Tinglado Bar", is_active: true })]);
      }),
      http.patch(`${API_URL}/api/users/u1`, async ({ request }) => {
        calledWith = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(makeUser({ is_active: false }));
      }),
    );
    const user = userEvent.setup();
    renderWithClient();

    await screen.findByText("El Tinglado Bar");
    await user.click(screen.getByRole("button", { name: "Desactivar" }));

    await waitFor(() => expect(calledWith).toEqual({ is_active: false }));
  });
});
