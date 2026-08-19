import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { MyEventsView } from "@/features/events/components/MyEventsView";
import { clearToken, setToken } from "@/features/auth/lib/token-store";
import { makeEvent, makeUser } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MyEventsView />
    </QueryClientProvider>,
  );
}

function mockLoggedIn() {
  server.use(http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(makeUser())));
  setToken("test-token");
}

describe("MyEventsView", () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearToken();
  });

  it("prompts to log in when there is no active session", async () => {
    renderWithClient();

    expect(await screen.findByText(/Iniciá sesión para ver tus eventos/i)).toBeInTheDocument();
  });

  it("shows the three status groups and defaults to pending when logged in", async () => {
    mockLoggedIn();
    renderWithClient();

    expect(await screen.findByText("Noche de Rock Nacional")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Pendientes" })).toHaveAttribute("aria-selected", "true");
  });

  it("switches groups and shows an empty state", async () => {
    mockLoggedIn();
    server.use(
      http.get(`${API_URL}/api/events/mine`, () =>
        HttpResponse.json({
          pending: [makeEvent({ status: "pending" })],
          approved: [],
          rejected: [],
        }),
      ),
    );
    const user = userEvent.setup();
    renderWithClient();

    await screen.findByText("Noche de Rock Nacional");

    await user.click(screen.getByRole("tab", { name: "Aprobados" }));

    expect(await screen.findByText("No tenés eventos en este estado.")).toBeInTheDocument();
  });

  it("shows an error state when the request fails", async () => {
    mockLoggedIn();
    server.use(http.get(`${API_URL}/api/events/mine`, () => new HttpResponse(null, { status: 500 })));
    renderWithClient();

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });
});
