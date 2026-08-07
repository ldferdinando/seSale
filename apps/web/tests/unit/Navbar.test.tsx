import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { Navbar } from "@/components/layout/Navbar";
import { makeUser } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <Navbar />
    </QueryClientProvider>,
  );
}

describe("Navbar", () => {
  it("shows 'Ingresar' and 'Registrarse' when there is no active session", async () => {
    renderWithClient();

    const login = await screen.findByRole("link", { name: /Ingresar/ });
    expect(login).toHaveAttribute("href", "/login");
    const register = await screen.findByRole("link", { name: /Registrarse/ });
    expect(register).toHaveAttribute("href", "/registro");

    expect(screen.queryByText(/Mi cuenta/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cerrar sesión/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Panel admin/)).not.toBeInTheDocument();
  });

  it("shows public_name, 'Publicar evento' and 'Cerrar sesión' for a logged in user", async () => {
    server.use(http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(makeUser({ role: "user" }))));
    renderWithClient();

    const accountLink = await screen.findByRole("link", { name: /El Tinglado Bar/ });
    expect(accountLink).toHaveAttribute("href", "/mi-cuenta");

    const publishLink = screen.getByRole("link", { name: /Publicar evento/ });
    expect(publishLink).toHaveAttribute("href", "/publicar");

    expect(screen.getByRole("button", { name: /Cerrar sesión/ })).toBeInTheDocument();
    expect(screen.queryByText(/Ingresar/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Registrarse/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Panel admin/)).not.toBeInTheDocument();
  });

  it("falls back to the email when public_name is empty", async () => {
    server.use(
      http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(makeUser({ role: "user", public_name: "" }))),
    );
    renderWithClient();

    const accountLink = await screen.findByRole("link", { name: /organizador@sesale\.com\.ar/ });
    expect(accountLink).toHaveAttribute("href", "/mi-cuenta");
  });

  it("shows 'Panel admin' only for admins", async () => {
    server.use(http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(makeUser({ role: "admin" }))));
    renderWithClient();

    const adminLink = await screen.findByRole("link", { name: /Panel admin/ });
    expect(adminLink).toHaveAttribute("href", "/admin");
  });

  it("logs out and redirects to home on 'Cerrar sesión'", async () => {
    server.use(http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(makeUser({ role: "user" }))));
    const user = userEvent.setup();
    renderWithClient();

    const logoutButton = await screen.findByRole("button", { name: /Cerrar sesión/ });
    await user.click(logoutButton);

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  });
});
