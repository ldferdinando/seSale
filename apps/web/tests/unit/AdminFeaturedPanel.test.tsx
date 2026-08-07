import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { AdminFeaturedPanel } from "@/features/admin/components/AdminFeaturedPanel";
import { makeEvent, makeUser } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminFeaturedPanel />
    </QueryClientProvider>,
  );
}

function mockLoggedInAdmin() {
  server.use(http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(makeUser({ role: "admin" }))));
}

describe("AdminFeaturedPanel", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("prompts to log in when there is no active session", async () => {
    renderWithClient();

    expect(await screen.findByText(/Iniciá sesión para acceder al panel/i)).toBeInTheDocument();
  });

  it("denies access to non-admin users", async () => {
    server.use(http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(makeUser({ role: "user" }))));
    renderWithClient();

    expect(await screen.findByText(/No tenés permiso para ver esta sección/i)).toBeInTheDocument();
  });

  it("lists events in the order returned by the API, with featured toggle and plan select", async () => {
    mockLoggedInAdmin();
    server.use(
      http.get(`${API_URL}/api/events`, () =>
        HttpResponse.json([
          makeEvent({ id: "a", title: "Evento Pro", plan: "pro" }),
          makeEvent({ id: "b", title: "Evento Gratis", plan: "gratis" }),
        ]),
      ),
    );
    renderWithClient();

    const rows = await screen.findAllByTestId("admin-event-row");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("Evento Pro")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Evento Gratis")).toBeInTheDocument();
    expect(within(rows[0]).getByRole("switch")).toBeInTheDocument();
  });

  it("toggling is_featured invalidates the cache and updates the UI without a reload", async () => {
    mockLoggedInAdmin();
    let isFeatured = false;
    server.use(
      http.get(`${API_URL}/api/events`, () => HttpResponse.json([makeEvent({ id: "a", is_featured: isFeatured })])),
      http.patch(`${API_URL}/api/events/:id/featured`, async ({ request }) => {
        const body = (await request.json()) as { is_featured: boolean };
        isFeatured = body.is_featured;
        return HttpResponse.json(makeEvent({ id: "a", is_featured: isFeatured }));
      }),
    );
    const user = userEvent.setup();
    renderWithClient();

    const toggle = await screen.findByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");

    await user.click(toggle);

    await waitFor(() => expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true"));
  });
});
