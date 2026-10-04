import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { EventList } from "@/features/events/components/EventList";
import { makeEvent } from "./mocks/handlers";
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
      expect(screen.getByText("Aún no se registran eventos")).toBeInTheDocument(),
    );
  });

  it("shows an error state when the request fails", async () => {
    server.use(http.get(`${API_URL}/api/events`, () => new HttpResponse(null, { status: 500 })));

    renderWithClient(<EventList filters={{}} />);

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });

  it("does not fetch events while enabled=false (e.g. detecting the active city) and shows the skeleton", async () => {
    let requested = false;
    server.use(
      http.get(`${API_URL}/api/events`, () => {
        requested = true;
        return HttpResponse.json([]);
      }),
    );

    renderWithClient(<EventList filters={{}} enabled={false} />);

    expect(screen.getByTestId("event-list-loading")).toBeInTheDocument();
    expect(requested).toBe(false);
  });
});

describe("EventList — orden de la agenda", () => {
  it("orders by date, then plan (Plus → Destacado → Gratis) within the same day, then start time", async () => {
    server.use(
      http.get(`${API_URL}/api/events`, () =>
        HttpResponse.json([
          makeEvent({ id: "e1", title: "Gratis temprano", date: "2099-05-01", time: "12:00:00", plan: "gratis" }),
          makeEvent({ id: "e2", title: "Dest tarde", date: "2099-05-01", time: "23:00:00", plan: "dest" }),
          makeEvent({ id: "e3", title: "Plus tarde", date: "2099-05-01", time: "23:30:00", plan: "pro" }),
          makeEvent({ id: "e4", title: "Dest temprano", date: "2099-05-01", time: "20:00:00", plan: "dest" }),
          makeEvent({ id: "e5", title: "Plus día siguiente", date: "2099-05-02", time: "10:00:00", plan: "pro" }),
          makeEvent({ id: "e0", title: "Gratis día anterior", date: "2099-04-30", time: "22:00:00", plan: "gratis" }),
        ]),
      ),
    );

    renderWithClient(<EventList filters={{}} />);

    await waitFor(() => expect(screen.getAllByTestId("event-card")).toHaveLength(6));
    const titles = screen.getAllByTestId("event-card").map((card) => card.textContent ?? "");
    const order = [
      "Gratis día anterior",
      "Plus tarde",
      "Dest temprano",
      "Dest tarde",
      "Gratis temprano",
      "Plus día siguiente",
    ];
    order.forEach((title, index) => expect(titles[index]).toContain(title));
  });
});
