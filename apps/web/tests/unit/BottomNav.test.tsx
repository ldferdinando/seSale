import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(() => "/"),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
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
  });

  it('links "Mi cuenta" to /mi-cuenta when there is an active session', async () => {
    server.use(http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(makeUser())));
    setToken("test-token");

    renderWithClient();

    expect(await screen.findByRole("link", { name: /Mi cuenta/ })).toHaveAttribute("href", "/mi-cuenta");
  });

  it('links to /login as "Ingresar" when there is no active session', async () => {
    renderWithClient();

    expect(await screen.findByRole("link", { name: /Ingresar/ })).toHaveAttribute("href", "/login");
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
});
