import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { Navbar } from "@/components/layout/Navbar";
import { clearToken, setToken } from "@/features/auth/lib/token-store";
import { makeUser } from "./mocks/handlers";
import { server } from "./mocks/server";
import { renderWithActiveCity as renderWithClient } from "./test-utils";

const API_URL = "http://localhost:8000";

describe("Navbar", () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearToken();
  });

  it("does not show 'Ingresar'/'Registrarse' when there is no active session (Etapa 11b: acceso solo desde el botón inferior)", async () => {
    renderWithClient(<Navbar />);

    await screen.findByRole("button", { name: /Gral\. Roca/ });
    expect(screen.queryByRole("link", { name: /Ingresar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Registrarse/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Mi cuenta/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cerrar sesión/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Panel admin/)).not.toBeInTheDocument();
  });

  it("shows the '¿Qué es seSALE?' link regardless of session state", async () => {
    renderWithClient(<Navbar />);

    const link = await screen.findByRole("link", { name: /¿Qué es seSALE\?/ });
    expect(link).toHaveAttribute("href", "/que-es-sesale");
  });

  it("shows public_name, 'Publicar evento' and 'Cerrar sesión' for a logged in user", async () => {
    server.use(http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(makeUser({ role: "user" }))));
    setToken("test-token");
    renderWithClient(<Navbar />);

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
    setToken("test-token");
    renderWithClient(<Navbar />);

    const accountLink = await screen.findByRole("link", { name: /organizador@sesale\.com\.ar/ });
    expect(accountLink).toHaveAttribute("href", "/mi-cuenta");
  });

  it("shows 'Panel admin' only for admins", async () => {
    server.use(http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(makeUser({ role: "admin" }))));
    setToken("test-token");
    renderWithClient(<Navbar />);

    const adminLink = await screen.findByRole("link", { name: /Panel admin/ });
    expect(adminLink).toHaveAttribute("href", "/admin");
  });

  it("logs out and redirects to home on 'Cerrar sesión'", async () => {
    server.use(http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(makeUser({ role: "user" }))));
    setToken("test-token");
    const user = userEvent.setup();
    renderWithClient(<Navbar />);

    const logoutButton = await screen.findByRole("button", { name: /Cerrar sesión/ });
    await user.click(logoutButton);

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  });

  it("shows a skeleton while detecting the active city, then the city name", async () => {
    renderWithClient(<Navbar />);

    expect(screen.getByTestId("city-selector-skeleton")).toBeInTheDocument();

    await waitFor(() => expect(screen.getByRole("button", { name: /Gral\. Roca/ })).toBeInTheDocument());
    expect(screen.queryByTestId("city-selector-skeleton")).not.toBeInTheDocument();
  });

  it("opens the dropdown with active cities and marks the current one", async () => {
    const user = userEvent.setup();
    renderWithClient(<Navbar />);

    const cityButton = await screen.findByRole("button", { name: /Gral\. Roca/ });
    await user.click(cityButton);

    const menu = screen.getByRole("menu", { name: "Elegir ciudad" });
    const rocaOption = within(menu).getByRole("menuitemradio", { name: /General Roca/ });
    const cipoOption = within(menu).getByRole("menuitemradio", { name: /Cipolletti/ });
    expect(rocaOption).toHaveAttribute("aria-checked", "true");
    expect(cipoOption).toHaveAttribute("aria-checked", "false");
  });

  it("changes the active city when an option is picked from the dropdown", async () => {
    const user = userEvent.setup();
    renderWithClient(<Navbar />);

    const cityButton = await screen.findByRole("button", { name: /Gral\. Roca/ });
    await user.click(cityButton);
    await user.click(screen.getByRole("menuitemradio", { name: /Cipolletti/ }));

    await waitFor(() => expect(screen.getByRole("button", { name: /Cipolletti/ })).toBeInTheDocument());
    expect(window.localStorage.getItem("sesale_selected_city_id")).toBe("cccccccc-cccc-4ccc-cccc-cccccccccccc");
  });

  it("'Detectar mi ubicación' clears the saved city and re-triggers detection", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("sesale_selected_city_id", "cccccccc-cccc-4ccc-cccc-cccccccccccc");
    renderWithClient(<Navbar />);

    const cityButton = await screen.findByRole("button", { name: /Cipolletti/ });
    await user.click(cityButton);
    await user.click(screen.getByRole("button", { name: /Detectar mi ubicación/ }));

    // Sin GPS disponible en jsdom, vuelve a caer al default (General Roca).
    await waitFor(() => expect(screen.getByRole("button", { name: /Gral\. Roca/ })).toBeInTheDocument());
  });
});
