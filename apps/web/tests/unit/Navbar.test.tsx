import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

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
  it("shows 'Ingresar' linking to /login when there is no active session", async () => {
    renderWithClient();

    const link = await screen.findByRole("link", { name: /Ingresar/ });
    expect(link).toHaveAttribute("href", "/login");
  });

  it("shows 'Mi cuenta' linking to /mis-eventos when logged in", async () => {
    server.use(http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(makeUser())));
    renderWithClient();

    const link = await screen.findByRole("link", { name: /Mi cuenta/ });
    expect(link).toHaveAttribute("href", "/mis-eventos");
  });
});
