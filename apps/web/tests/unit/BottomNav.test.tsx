import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

import { BottomNav } from "@/components/layout/BottomNav";
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
  it('links "Mi cuenta" to /mi-cuenta when there is an active session', async () => {
    server.use(http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(makeUser())));

    renderWithClient();

    expect(await screen.findByRole("link", { name: /Mi cuenta/ })).toHaveAttribute("href", "/mi-cuenta");
  });

  it('links to /login as "Ingresar" when there is no active session', async () => {
    renderWithClient();

    expect(await screen.findByRole("link", { name: /Ingresar/ })).toHaveAttribute("href", "/login");
  });
});
