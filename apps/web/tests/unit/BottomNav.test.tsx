import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

const { usePathnameMock, pushMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(() => "/"),
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
  useRouter: () => ({ push: pushMock }),
}));

import { BottomNav } from "@/components/layout/BottomNav";
import { clearToken, setToken } from "@/features/auth/lib/token-store";
import { makeUser } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BottomNav />
    </QueryClientProvider>,
  );
}

describe("BottomNav", () => {
  afterEach(() => {
    clearToken();
    pushMock.mockClear();
  });

  // Etapa "Cambios de diseño TIPO B v2.2" (punto 4): el quinto botón pasa a
  // ser "Contactanos" (WhatsApp) siempre, con o sin sesión — "Mi cuenta"
  // sigue accesible desde el Navbar para un usuario logueado (ver
  // a_revisar.md sobre este trade-off).
  it('shows "Contactanos" (WhatsApp) regardless of session state', async () => {
    renderWithClient();

    const link = await screen.findByRole("link", { name: /Contactanos/ });
    expect(link).toHaveAttribute("href", expect.stringContaining("wa.me"));
    expect(link).toHaveAttribute("target", "_blank");
  });

  it('shows "Contactanos" even with an active session, not "Mi cuenta"', async () => {
    server.use(http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(makeUser())));
    setToken("test-token");

    renderWithClient();

    expect(await screen.findByRole("link", { name: /Contactanos/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Mi cuenta/ })).not.toBeInTheDocument();
  });

  it('"Publicar" navigates straight to /publicar when there is an active session', async () => {
    const user = userEvent.setup();
    server.use(http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(makeUser())));
    setToken("test-token");

    renderWithClient();

    const publishButton = await screen.findByRole("button", { name: /Publicar/ });
    await user.click(publishButton);

    expect(pushMock).toHaveBeenCalledWith("/publicar");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it('"Publicar" opens the free-to-publish gate popup when there is no active session', async () => {
    const user = userEvent.setup();
    renderWithClient();

    const publishButton = await screen.findByRole("button", { name: /Publicar/ });
    await user.click(publishButton);

    expect(pushMock).not.toHaveBeenCalledWith("/publicar");
    const dialog = await screen.findByRole("dialog", { name: /Publicar un evento/ });
    expect(dialog).toHaveTextContent(/gratis/i);
  });

  it('the gate popup "Ingresar para publicar" navigates to /login', async () => {
    const user = userEvent.setup();
    renderWithClient();

    await user.click(await screen.findByRole("button", { name: /Publicar/ }));
    await user.click(await screen.findByRole("button", { name: /Ingresar para publicar/ }));

    expect(pushMock).toHaveBeenCalledWith(expect.stringContaining("/login"));
  });

  it('the gate popup "Seguir navegando" closes without navigating', async () => {
    const user = userEvent.setup();
    renderWithClient();

    await user.click(await screen.findByRole("button", { name: /Publicar/ }));
    await user.click(await screen.findByRole("button", { name: /Seguir navegando/ }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  // Etapa 9a — tab Gastronomía habilitado (ver a_revisar.md).
  it('links "Gastronomía" to /lugares and has no "Próximamente" state', () => {
    usePathnameMock.mockReturnValue("/");
    renderWithClient();

    const link = screen.getByRole("link", { name: /Gastronomía/ });
    expect(link).toHaveAttribute("href", "/lugares");
    expect(link).not.toHaveAttribute("aria-disabled");
    expect(link).not.toHaveAttribute("title", "Próximamente");
  });

  it('marks "Gastronomía" as active on /lugares', () => {
    usePathnameMock.mockReturnValue("/lugares");
    renderWithClient();

    expect(screen.getByRole("link", { name: /Gastronomía/ })).toHaveClass("text-primary");
  });

  it('marks "Gastronomía" as active on a place detail route (/lugares/{id})', () => {
    usePathnameMock.mockReturnValue("/lugares/11111111-1111-1111-1111-111111111111");
    renderWithClient();

    expect(screen.getByRole("link", { name: /Gastronomía/ })).toHaveClass("text-primary");
  });

  it('does not mark "Gastronomía" as active on an unrelated route', () => {
    usePathnameMock.mockReturnValue("/");
    renderWithClient();

    expect(screen.getByRole("link", { name: /Gastronomía/ })).not.toHaveClass("text-primary");
  });

  // Etapa 13a — tab Categorías habilitado (sección propia).
  it('links "Categorías" to /categorias and has no "Próximamente" state', () => {
    usePathnameMock.mockReturnValue("/");
    renderWithClient();

    const link = screen.getByRole("link", { name: /Categorías/ });
    expect(link).toHaveAttribute("href", "/categorias");
    expect(link).not.toHaveAttribute("aria-disabled");
    expect(link).not.toHaveAttribute("title", "Próximamente");
  });

  it('marks "Categorías" as active on /categorias', () => {
    usePathnameMock.mockReturnValue("/categorias");
    renderWithClient();

    expect(screen.getByRole("link", { name: /Categorías/ })).toHaveClass("text-primary");
  });

  it('marks "Categorías" as active on a category detail route (/categorias/{key})', () => {
    usePathnameMock.mockReturnValue("/categorias/musica");
    renderWithClient();

    expect(screen.getByRole("link", { name: /Categorías/ })).toHaveClass("text-primary");
  });
});
