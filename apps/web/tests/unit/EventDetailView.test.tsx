import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
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

  it("shows the organizer's payment status when the event is pending and the plan is dest/pro (owner/admin only)", async () => {
    const event = makeEventDetail({
      status: "pending",
      organizer_subscription: {
        status: "pending_approval",
        payment_method: "transfer",
        plan_name: "Destacado",
        plan_type: "dest",
        transfer_note: "Ya transferí, mando el comprobante por WhatsApp",
        created_at: "2099-01-01T00:00:00Z",
        reviewed_at: null,
      },
    });

    renderWithClient(event);

    expect(screen.getByText(/pendiente de revisión/)).toBeInTheDocument();
    expect(screen.getByText(/Ya transferí, mando el comprobante por WhatsApp/)).toBeInTheDocument();
  });

  it("does not show any payment status block when organizer_subscription is null", () => {
    renderWithClient(makeEventDetail({ status: "pending", organizer_subscription: null }));

    expect(screen.queryByText(/pendiente de revisión/)).not.toBeInTheDocument();
  });

  it("does not show the payment status block once the event is already approved", () => {
    const event = makeEventDetail({
      status: "approved",
      organizer_subscription: {
        status: "pending_approval",
        payment_method: "transfer",
        plan_name: "Destacado",
        plan_type: "dest",
        transfer_note: "Ya transferí",
        created_at: "2099-01-01T00:00:00Z",
        reviewed_at: null,
      },
    });

    renderWithClient(event);

    expect(screen.queryByText(/pendiente de revisión/)).not.toBeInTheDocument();
  });

  it("does not show the payment status block for the gratis plan", () => {
    const event = makeEventDetail({
      status: "pending",
      organizer_subscription: {
        status: "active",
        payment_method: "mercadopago",
        plan_name: "Gratuito",
        plan_type: "gratis",
        transfer_note: null,
        created_at: "2099-01-01T00:00:00Z",
        reviewed_at: null,
      },
    });

    renderWithClient(event);

    expect(screen.queryByText("Gratuito")).not.toBeInTheDocument();
  });

  it("shows the map and description/hours when the location has coordinates", async () => {
    const event = makeEventDetail({
      location: {
        id: "33333333-3333-3333-3333-333333333333",
        name: "El Tinglado Bar",
        address: "Av. Roca 1240",
        city_id: "22222222-2222-2222-2222-222222222222",
        latitude: -39.032,
        longitude: -67.581,
        description: "Espacio cultural con shows en vivo",
        hours: "Jueves a sábados 21:00 a 03:00",
        place_type: "bar",
        is_verified: true,
        is_public: true,
      },
    });

    const { container } = renderWithClient(event);

    await waitFor(() => expect(container.querySelector(".leaflet-container")).not.toBeNull());
    expect(screen.getByText("Espacio cultural con shows en vivo")).toBeInTheDocument();
    expect(screen.getByText("Jueves a sábados 21:00 a 03:00")).toBeInTheDocument();
  });

  it("does not show the map when the location has no coordinates", () => {
    const event = makeEventDetail({
      location: {
        id: "33333333-3333-3333-3333-333333333333",
        name: "El Tinglado Bar",
        address: "Av. Roca 1240",
        city_id: "22222222-2222-2222-2222-222222222222",
        latitude: null,
        longitude: null,
        description: null,
        hours: null,
        place_type: null,
        is_verified: false,
        is_public: false,
      },
    });

    const { container } = renderWithClient(event);

    expect(container.querySelector(".leaflet-container")).toBeNull();
  });

  describe("flyer (Etapa 8b — exclusivo del plan Destacado Plus)", () => {
    it("shows a dark placeholder with no text when there is no flyer_url", () => {
      const { container } = renderWithClient(makeEventDetail({ plan: "gratis", flyer_url: null }));

      expect(container.querySelector('[data-testid="flyer-placeholder"]')).not.toBeNull();
    });

    it("shows the flyer image as clickable when plan is pro", () => {
      const event = makeEventDetail({ plan: "pro", flyer_url: "https://example.com/flyer.jpg" });
      renderWithClient(event);

      const img = screen.getByAltText(event.title) as HTMLImageElement;
      expect(img.src).toBe("https://example.com/flyer.jpg");
      expect(screen.getByText("Ver flyer")).toBeInTheDocument();
    });

    it("opens the lightbox when clicking the flyer image on a pro plan event", async () => {
      const event = makeEventDetail({ plan: "pro", flyer_url: "https://example.com/flyer.jpg" });
      renderWithClient(event);

      screen.getByAltText(event.title).click();

      expect(await screen.findByRole("dialog")).toBeInTheDocument();
    });

    it("closes the lightbox with the close button", async () => {
      const event = makeEventDetail({ plan: "pro", flyer_url: "https://example.com/flyer.jpg" });
      renderWithClient(event);

      screen.getByAltText(event.title).click();
      await screen.findByRole("dialog");
      screen.getByLabelText("Cerrar").click();

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("shows the flyer image but not clickable when plan is dest", () => {
      const event = makeEventDetail({ plan: "dest", flyer_url: "https://example.com/flyer.jpg" });
      renderWithClient(event);

      const img = screen.getByAltText(event.title) as HTMLImageElement;
      expect(img.src).toBe("https://example.com/flyer.jpg");
      expect(screen.queryByText("Ver flyer")).not.toBeInTheDocument();

      img.click();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("hides the image for the gratis plan even if flyer_url has a value", () => {
      const event = makeEventDetail({ plan: "gratis", flyer_url: "https://example.com/flyer.jpg" });
      const { container } = renderWithClient(event);

      expect(screen.queryByAltText(event.title)).not.toBeInTheDocument();
      expect(container.querySelector('[data-testid="flyer-placeholder"]')).not.toBeNull();
    });
  });
});
