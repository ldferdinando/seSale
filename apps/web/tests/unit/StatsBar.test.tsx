import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { StatsBar } from "@/features/events/components/StatsBar";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("StatsBar", () => {
  it("renders the three stats values from the API", async () => {
    server.use(
      http.get(`${API_URL}/api/stats`, () =>
        HttpResponse.json({ total_events: 8, total_organizers: 2, total_cities: 1 }),
      ),
    );

    renderWithClient(<StatsBar />);

    await waitFor(() => expect(screen.getByText("8")).toBeInTheDocument());
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Eventos activos")).toBeInTheDocument();
    expect(screen.getByText("Organizadores")).toBeInTheDocument();
    expect(screen.getByText("Ciudades")).toBeInTheDocument();
  });
});
