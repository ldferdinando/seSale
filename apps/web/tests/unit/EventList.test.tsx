import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { EventList } from "@/features/events/components/EventList";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("EventList", () => {
  it("shows a loading state while fetching", () => {
    renderWithClient(<EventList filters={{}} />);

    expect(screen.getByTestId("event-list-loading")).toBeInTheDocument();
  });

  it("shows the events once loaded", async () => {
    renderWithClient(<EventList filters={{}} />);

    await waitFor(() => expect(screen.getByTestId("event-card")).toBeInTheDocument());
    expect(screen.getByText("Noche de Rock Nacional")).toBeInTheDocument();
  });

  it("shows an empty state when there are no events", async () => {
    server.use(http.get(`${API_URL}/api/events`, () => HttpResponse.json([])));

    renderWithClient(<EventList filters={{}} />);

    await waitFor(() =>
      expect(screen.getByText("No hay eventos para mostrar con estos filtros.")).toBeInTheDocument(),
    );
  });

  it("shows an error state when the request fails", async () => {
    server.use(http.get(`${API_URL}/api/events`, () => new HttpResponse(null, { status: 500 })));

    renderWithClient(<EventList filters={{}} />);

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });
});
