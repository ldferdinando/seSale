import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EventDetailView } from "@/features/events/components/EventDetailView";
import { makeEventDetail, makeUser } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderWithClient(event = makeEventDetail()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EventDetailView event={event} />
    </QueryClientProvider>,
  );
}

function mockLoggedInAs(user: ReturnType<typeof makeUser>) {
  server.use(http.get(`${API_URL}/api/users/me`, () => HttpResponse.json(user)));
}

describe("EventDetailView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders all the main fields", () => {
    const event = makeEventDetail({
      title: "Noche de Jazz",
      description: "Una noche especial de jazz en vivo",
    });

    renderWithClient(event);

    expect(screen.getByText("Noche de Jazz")).toBeInTheDocument();
    expect(screen.getByText("Una noche especial de jazz en vivo")).toBeInTheDocument();
    expect(screen.getAllByText("El Tinglado Bar").length).toBeGreaterThan(0);
    expect(screen.getByText("Av. Roca 1240")).toBeInTheDocument();
    expect(screen.getByText("Música en vivo")).toBeInTheDocument();
    // event.time = "21:00:00" UTC, event.time_end = "23:30:00" UTC → 18:00/20:30 hora Argentina (UTC-3)
    expect(screen.getByText(/18:00 a 20:30 hs/)).toBeInTheDocument();
  });

  it("shows the available_on_site indicator only when true", () => {
    const { rerender } = render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <EventDetailView event={makeEventDetail({ available_on_site: false })} />
      </QueryClientProvider>,
    );
    expect(screen.queryByText(/Habrá lugar en la puerta/)).not.toBeInTheDocument();

    rerender(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <EventDetailView event={makeEventDetail({ available_on_site: true })} />
      </QueryClientProvider>,
    );
    expect(screen.getByText(/Habrá lugar en la puerta/)).toBeInTheDocument();
  });

  it("only renders contact links that have a value", () => {
    const event = makeEventDetail({
      contact_whatsapp: "+5492984567890",
      contact_instagram: null,
      contact_web: null,
      contact_email: "contacto@eltinglado.com",
    });

    renderWithClient(event);

    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
    expect(screen.queryByText("Instagram")).not.toBeInTheDocument();
    expect(screen.queryByText("Página web")).not.toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("uses the Web Share API when available", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: shareMock, configurable: true });

    const event = makeEventDetail();
    renderWithClient(event);

    screen.getByText("Compartir").click();

    expect(shareMock).toHaveBeenCalledTimes(1);
    expect(shareMock.mock.calls[0][0].title).toBe(`${event.title} — seSALE`);
    expect(shareMock.mock.calls[0][0].url).toContain(`/eventos/${event.id}`);
  });

  it("falls back to wa.me when Web Share API is not available", async () => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    const openMock = vi.fn();
    vi.stubGlobal("open", openMock);

    const event = makeEventDetail();
    renderWithClient(event);

    screen.getByText("Compartir").click();

    expect(openMock).toHaveBeenCalledTimes(1);
    expect(openMock.mock.calls[0][0]).toContain("https://wa.me/?text=");
    expect(decodeURIComponent(openMock.mock.calls[0][0])).toContain(`/eventos/${event.id}`);
  });

  it("does not show the edit button for an anonymous visitor", async () => {
    renderWithClient();

    expect(screen.queryByText("Editar evento")).not.toBeInTheDocument();
  });

  it("shows the edit button when the current user is the organizer", async () => {
    const event = makeEventDetail({ organizer_id: "44444444-4444-4444-4444-444444444444" });
    mockLoggedInAs(makeUser({ id: "44444444-4444-4444-4444-444444444444", role: "user" }));

    renderWithClient(event);

    expect(await screen.findByText("Editar evento")).toBeInTheDocument();
  });

  it("shows the edit button when the current user is an admin", async () => {
    const event = makeEventDetail({ organizer_id: "44444444-4444-4444-4444-444444444444" });
    mockLoggedInAs(makeUser({ id: "99999999-9999-9999-9999-999999999999", role: "admin" }));

    renderWithClient(event);

    expect(await screen.findByText("Editar evento")).toBeInTheDocument();
  });

  it("does not show the edit button for a different, non-admin user", async () => {
    const event = makeEventDetail({ organizer_id: "44444444-4444-4444-4444-444444444444" });
    mockLoggedInAs(makeUser({ id: "99999999-9999-9999-9999-999999999999", role: "user" }));

    renderWithClient(event);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText("Editar evento")).not.toBeInTheDocument();
  });
});
