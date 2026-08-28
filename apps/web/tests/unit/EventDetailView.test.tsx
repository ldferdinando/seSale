import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EventDetailView } from "@/features/events/components/EventDetailView";
import { clearToken, setToken } from "@/features/auth/lib/token-store";
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
  setToken("test-token");
}

describe("EventDetailView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearToken();
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
    // Etapa 10c: el separador pasa de " a " a "–" (formatEventDateRange).
    expect(screen.getByText(/18:00 – 20:30 hs/)).toBeInTheDocument();
  });

  // Etapa 10c: date_end en el detalle.
  it("with date === date_end, does not show the extra span line", () => {
    const event = makeEventDetail({ date: "2099-01-01", date_end: "2099-01-01" });

    renderWithClient(event);

    expect(screen.queryByText(/Termina el/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Del /)).not.toBeInTheDocument();
  });

  it("with date_end = date + 1 day, shows 'Termina el {día} {fecha}'", () => {
    const event = makeEventDetail({
      date: "2024-03-15",
      date_end: "2024-03-16",
      time: "22:00:00",
      time_end: "06:00:00",
    });

    renderWithClient(event);

    // 2024-03-16 es sábado.
    expect(screen.getByText(/Termina el sábado 16 de marzo/)).toBeInTheDocument();
  });

  it("with date_end > date + 1 day, shows 'Del {fecha_inicio} al {fecha_fin}'", () => {
    const event = makeEventDetail({
      date: "2024-03-15",
      date_end: "2024-03-17",
      time: "23:00:00",
      time_end: "05:00:00",
    });

    renderWithClient(event);

    // 2024-03-15 es viernes, 2024-03-17 es domingo.
    expect(screen.getByText(/Del viernes 15 al domingo 17 de marzo/)).toBeInTheDocument();
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

    expect(screen.getByTestId("ticket-whatsapp-link")).toBeInTheDocument();
    expect(screen.queryByText("Instagram")).not.toBeInTheDocument();
    expect(screen.queryByText("Página web")).not.toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  // Etapa 12a — links de contacto: target="_blank" + prefijo 549 en WhatsApp.
  it("WhatsApp link opens in a new tab with the 549 (Argentina) prefix", () => {
    const event = makeEventDetail({ contact_whatsapp: "2984123456" });

    renderWithClient(event);

    const link = screen.getByTestId("ticket-whatsapp-link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("href", "https://wa.me/5492984123456");
  });

  it("Instagram link opens in a new tab with the correct href", () => {
    const event = makeEventDetail({ contact_instagram: "mi_cuenta" });

    renderWithClient(event);

    const link = screen.getByText("Instagram").closest("a");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("href", "https://instagram.com/mi_cuenta");
  });

  it("shows a Facebook link, opening in a new tab, when contact_facebook is set", () => {
    const event = makeEventDetail({ contact_facebook: "MiPaginaFacebook" });

    renderWithClient(event);

    const link = screen.getByTestId("ticket-facebook-link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("href", "https://facebook.com/MiPaginaFacebook");
  });

  it("does not show a Facebook link when contact_facebook is null", () => {
    const event = makeEventDetail({ contact_facebook: null });

    renderWithClient(event);

    expect(screen.queryByTestId("ticket-facebook-link")).not.toBeInTheDocument();
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

  it("Etapa 11a — bug real: sigue mostrando el estado de pago pendiente aunque el evento ya esté aprobado", () => {
    // Ver OrganizerSubscriptionBadge.tsx: antes se ocultaba apenas el
    // evento pasaba a "approved", aunque la suscripción (pago) siguiera sin
    // revisar — el admin perdía de vista que faltaba aprobarla en
    // Suscripciones y el evento quedaba en "gratis" para siempre.
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

    expect(screen.getByText(/pendiente de revisión/)).toBeInTheDocument();
  });

  it("does not show the payment status block once the subscription is already active", () => {
    const event = makeEventDetail({
      status: "approved",
      plan: "dest",
      organizer_subscription: {
        status: "active",
        payment_method: "transfer",
        plan_name: "Destacado",
        plan_type: "dest",
        transfer_note: "Ya transferí",
        created_at: "2099-01-01T00:00:00Z",
        reviewed_at: "2099-01-02T00:00:00Z",
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
    // Etapa 10b-2: el horario del lugar ahora se muestra junto a la
    // dirección, dentro del bloque "Lugar" (`event-location-card`).
    expect(screen.getByTestId("event-location-card").textContent).toContain("Jueves a sábados 21:00 a 03:00");
  });

  // Etapa 10b-2: bloque "Lugar" separado — botón "Cómo llegar" a Google Maps
  // (mismo patrón que GastroPlaceCard/GastroDetailView, Etapa 10b-1) y badge
  // de verificación del lugar (Location.is_verified, ya existía en el
  // modelo/schema).
  it('shows a "Cómo llegar" button and the verified badge for the location', () => {
    const event = makeEventDetail({
      location: {
        id: "33333333-3333-3333-3333-333333333333",
        name: "El Tinglado Bar",
        address: "Av. Roca 1240",
        city_id: "22222222-2222-2222-2222-222222222222",
        latitude: -39.032,
        longitude: -67.581,
        description: null,
        hours: null,
        place_type: "bar",
        is_verified: true,
        is_public: true,
      },
    });

    renderWithClient(event);

    const mapLink = screen.getByTestId("event-location-map-link");
    expect(mapLink).toHaveAttribute("href", expect.stringContaining("-39.032,-67.581"));
    expect(screen.getByTestId("location-verified-icon")).toBeInTheDocument();
  });

  it("does not show the location verified badge when is_verified is false", () => {
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
        place_type: "bar",
        is_verified: false,
        is_public: true,
      },
    });

    renderWithClient(event);

    expect(screen.queryByTestId("location-verified-icon")).not.toBeInTheDocument();
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

  describe("flyer (Etapa 12b — bloque de imagen/placeholder solo para Destacado Plus)", () => {
    it("shows the placeholder when plan is pro and there is no flyer", () => {
      const { container } = renderWithClient(
        makeEventDetail({ plan: "pro", flyer_url_desktop: null, flyer_url_mobile: null }),
      );

      expect(container.querySelector('[data-testid="flyer-placeholder"]')).not.toBeNull();
    });

    it("shows the desktop flyer image as clickable when plan is pro", () => {
      const event = makeEventDetail({ plan: "pro", flyer_url_desktop: "https://example.com/d.jpg" });
      renderWithClient(event);

      const img = screen.getByAltText(event.title) as HTMLImageElement;
      expect(img.src).toBe("https://example.com/d.jpg");
      expect(screen.getByText("Ver flyer")).toBeInTheDocument();
    });

    it("uses a <picture> with a mobile <source> when flyer_url_mobile is set", () => {
      const event = makeEventDetail({
        plan: "pro",
        flyer_url_desktop: "https://example.com/d.jpg",
        flyer_url_mobile: "https://example.com/m.jpg",
      });
      const { container } = renderWithClient(event);

      const source = container.querySelector("picture source") as HTMLSourceElement;
      expect(source).not.toBeNull();
      expect(source.getAttribute("media")).toBe("(max-width: 767px)");
      expect(source.getAttribute("srcset")).toBe("https://example.com/m.jpg");
    });

    it("has no <source> when there is no mobile flyer (picture falls back to desktop img)", () => {
      const event = makeEventDetail({
        plan: "pro",
        flyer_url_desktop: "https://example.com/d.jpg",
        flyer_url_mobile: null,
      });
      const { container } = renderWithClient(event);

      expect(container.querySelector("picture source")).toBeNull();
      expect((screen.getByAltText(event.title) as HTMLImageElement).src).toBe("https://example.com/d.jpg");
    });

    it("opens the lightbox when clicking the flyer image on a pro plan event", async () => {
      const event = makeEventDetail({ plan: "pro", flyer_url_desktop: "https://example.com/d.jpg" });
      renderWithClient(event);

      screen.getByAltText(event.title).click();

      expect(await screen.findByRole("dialog")).toBeInTheDocument();
    });

    it("closes the lightbox with the close button", async () => {
      const event = makeEventDetail({ plan: "pro", flyer_url_desktop: "https://example.com/d.jpg" });
      renderWithClient(event);

      screen.getByAltText(event.title).click();
      await screen.findByRole("dialog");
      screen.getByLabelText("Cerrar").click();

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("renders no image and no placeholder for plan dest, even with a flyer_url_desktop", () => {
      const event = makeEventDetail({ plan: "dest", flyer_url_desktop: "https://example.com/d.jpg" });
      const { container } = renderWithClient(event);

      expect(screen.queryByAltText(event.title)).not.toBeInTheDocument();
      expect(container.querySelector('[data-testid="flyer-placeholder"]')).toBeNull();
    });

    it("renders no image and no placeholder for plan gratis", () => {
      const event = makeEventDetail({ plan: "gratis", flyer_url_desktop: null });
      const { container } = renderWithClient(event);

      expect(screen.queryByAltText(event.title)).not.toBeInTheDocument();
      expect(container.querySelector('[data-testid="flyer-placeholder"]')).toBeNull();
    });
  });

  describe("expiry banners (Etapa 8c)", () => {
    const OWNER_ID = "44444444-4444-4444-4444-444444444444";
    const inDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    it("shows the amber banner when featured_until is within the next 7 days and the current user is the organizer", async () => {
      const event = makeEventDetail({ organizer_id: OWNER_ID, plan: "pro", featured_until: inDays(3) });
      mockLoggedInAs(makeUser({ id: OWNER_ID, role: "user" }));

      renderWithClient(event);

      expect(await screen.findByText(/Tu plan Destacado Plus vence el/)).toBeInTheDocument();
      expect(screen.getByText("Renovar plan")).toBeInTheDocument();
    });

    it("shows the red banner when featured_until already passed and the current user is the organizer", async () => {
      const event = makeEventDetail({ organizer_id: OWNER_ID, plan: "dest", featured_until: inDays(-1) });
      mockLoggedInAs(makeUser({ id: OWNER_ID, role: "user" }));

      renderWithClient(event);

      expect(await screen.findByText("Tu plan destacado venció")).toBeInTheDocument();
      expect(screen.getByText("Volver a destacar")).toBeInTheDocument();
    });

    it("does not show any expiry banner for an anonymous visitor", async () => {
      const event = makeEventDetail({ organizer_id: OWNER_ID, plan: "pro", featured_until: inDays(3) });

      renderWithClient(event);

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(screen.queryByText(/vence el/)).not.toBeInTheDocument();
      expect(screen.queryByText("Tu plan destacado venció")).not.toBeInTheDocument();
    });

    it("does not show any expiry banner for an authenticated user who is not the organizer", async () => {
      const event = makeEventDetail({ organizer_id: OWNER_ID, plan: "pro", featured_until: inDays(3) });
      mockLoggedInAs(makeUser({ id: "99999999-9999-9999-9999-999999999999", role: "user" }));

      renderWithClient(event);

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(screen.queryByText(/vence el/)).not.toBeInTheDocument();
    });

    it("does not show any expiry banner when featured_until is null", async () => {
      const event = makeEventDetail({ organizer_id: OWNER_ID, plan: "pro", featured_until: null });
      mockLoggedInAs(makeUser({ id: OWNER_ID, role: "user" }));

      renderWithClient(event);

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(screen.queryByText(/vence el/)).not.toBeInTheDocument();
      expect(screen.queryByText("Tu plan destacado venció")).not.toBeInTheDocument();
    });
  });

  // Etapa 9a — banner "Organizador verificado" con datos reales del
  // organizador (ver a_revisar.md).
  describe("organizer verification banner", () => {
    it("shows the banner when organizer.is_verified is true", () => {
      const event = makeEventDetail({
        organizer: {
          public_name: "El Tinglado Bar",
          public_whatsapp: null,
          city: null,
          is_verified: true,
          phone_verified: true,
          email_verified: true,
          member_since: "2024-03-01",
        },
      });

      renderWithClient(event);

      expect(screen.getByText("Identidad confirmada por seSALE")).toBeInTheDocument();
      expect(screen.getByText("Documento verificado")).toBeInTheDocument();
    });

    it("does not show the banner when organizer.is_verified is false", () => {
      const event = makeEventDetail({
        organizer: {
          public_name: "El Tinglado Bar",
          public_whatsapp: null,
          city: null,
          is_verified: false,
          phone_verified: false,
          email_verified: false,
          member_since: "2024-03-01",
        },
      });

      renderWithClient(event);

      expect(screen.queryByText("Identidad confirmada por seSALE")).not.toBeInTheDocument();
    });

    it('shows "Celular verificado" only when phone_verified is true', () => {
      const verified = makeEventDetail({
        organizer: {
          public_name: "El Tinglado Bar",
          public_whatsapp: null,
          city: null,
          is_verified: true,
          phone_verified: true,
          email_verified: false,
          member_since: "2024-03-01",
        },
      });
      const { unmount } = renderWithClient(verified);
      expect(screen.getByText("Celular verificado")).toBeInTheDocument();
      unmount();

      const notVerified = makeEventDetail({
        organizer: {
          public_name: "El Tinglado Bar",
          public_whatsapp: null,
          city: null,
          is_verified: true,
          phone_verified: false,
          email_verified: false,
          member_since: "2024-03-01",
        },
      });
      renderWithClient(notVerified);
      expect(screen.queryByText("Celular verificado")).not.toBeInTheDocument();
    });

    it('shows "Email verificado" only when email_verified is true', () => {
      const verified = makeEventDetail({
        organizer: {
          public_name: "El Tinglado Bar",
          public_whatsapp: null,
          city: null,
          is_verified: true,
          phone_verified: false,
          email_verified: true,
          member_since: "2024-03-01",
        },
      });
      const { unmount } = renderWithClient(verified);
      expect(screen.getByText("Email verificado")).toBeInTheDocument();
      unmount();

      const notVerified = makeEventDetail({
        organizer: {
          public_name: "El Tinglado Bar",
          public_whatsapp: null,
          city: null,
          is_verified: true,
          phone_verified: false,
          email_verified: false,
          member_since: "2024-03-01",
        },
      });
      renderWithClient(notVerified);
      expect(screen.queryByText("Email verificado")).not.toBeInTheDocument();
    });

    it('shows "Miembro desde" with month and year in Spanish', () => {
      const event = makeEventDetail({
        organizer: {
          public_name: "El Tinglado Bar",
          public_whatsapp: null,
          city: null,
          is_verified: true,
          phone_verified: true,
          email_verified: true,
          member_since: "2024-03-15",
        },
      });

      renderWithClient(event);

      expect(screen.getByText("Miembro desde marzo 2024")).toBeInTheDocument();
    });
  });

  // Etapa 10b-2 — "Dar de baja"/"Volver a publicar" (autoservicio del organizador).
  describe("dar de baja", () => {
    const OWNER_ID = "44444444-4444-4444-4444-444444444444";

    it('shows "Dar de baja este evento" for the owner with status=approved', async () => {
      const event = makeEventDetail({ organizer_id: OWNER_ID, status: "approved", is_active: true });
      mockLoggedInAs(makeUser({ id: OWNER_ID, role: "user" }));

      renderWithClient(event);

      expect(await screen.findByTestId("deactivate-event-button")).toBeInTheDocument();
      expect(screen.queryByTestId("reactivate-event-button")).not.toBeInTheDocument();
    });

    it('shows "Volver a publicar" when is_active is false', async () => {
      const event = makeEventDetail({ organizer_id: OWNER_ID, status: "approved", is_active: false });
      mockLoggedInAs(makeUser({ id: OWNER_ID, role: "user" }));

      renderWithClient(event);

      expect(await screen.findByTestId("reactivate-event-button")).toBeInTheDocument();
      expect(screen.getByText("Este evento está dado de baja.")).toBeInTheDocument();
      expect(screen.queryByTestId("deactivate-event-button")).not.toBeInTheDocument();
    });

    it("does not show the section for an anonymous visitor", () => {
      const event = makeEventDetail({ organizer_id: OWNER_ID, status: "approved", is_active: true });

      renderWithClient(event);

      expect(screen.queryByTestId("event-active-toggle-section")).not.toBeInTheDocument();
    });

    it("does not show the section for a user who is not the organizer", () => {
      const event = makeEventDetail({ organizer_id: OWNER_ID, status: "approved", is_active: true });
      mockLoggedInAs(makeUser({ id: "99999999-9999-9999-9999-999999999999", role: "user" }));

      renderWithClient(event);

      expect(screen.queryByTestId("event-active-toggle-section")).not.toBeInTheDocument();
    });

    it("does not show the section when status is not approved", () => {
      const event = makeEventDetail({ organizer_id: OWNER_ID, status: "pending", is_active: true });
      mockLoggedInAs(makeUser({ id: OWNER_ID, role: "user" }));

      renderWithClient(event);

      expect(screen.queryByTestId("event-active-toggle-section")).not.toBeInTheDocument();
    });

    it('clicking "Dar de baja este evento" shows the confirmation dialog', async () => {
      const event = makeEventDetail({ organizer_id: OWNER_ID, status: "approved", is_active: true });
      mockLoggedInAs(makeUser({ id: OWNER_ID, role: "user" }));

      renderWithClient(event);
      (await screen.findByTestId("deactivate-event-button")).click();

      expect(await screen.findByRole("dialog", { name: "¿Dar de baja este evento?" })).toBeInTheDocument();
    });

    it("confirming the dialog calls PUT with is_active: false", async () => {
      const event = makeEventDetail({ organizer_id: OWNER_ID, status: "approved", is_active: true });
      mockLoggedInAs(makeUser({ id: OWNER_ID, role: "user" }));

      let capturedBody: Record<string, unknown> | null = null;
      server.use(
        http.put(`${API_URL}/api/events/:id`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({ ...event, ...capturedBody });
        }),
      );

      renderWithClient(event);
      (await screen.findByTestId("deactivate-event-button")).click();
      (await screen.findByRole("button", { name: "Dar de baja" })).click();

      await waitFor(() => expect(capturedBody).toEqual({ is_active: false }));
      await waitFor(() => expect(screen.getByText("Tu evento fue dado de baja.")).toBeInTheDocument());
    });

    it('clicking "Volver a publicar" calls PUT with is_active: true, without a confirmation dialog', async () => {
      const event = makeEventDetail({ organizer_id: OWNER_ID, status: "approved", is_active: false });
      mockLoggedInAs(makeUser({ id: OWNER_ID, role: "user" }));

      let capturedBody: Record<string, unknown> | null = null;
      server.use(
        http.put(`${API_URL}/api/events/:id`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({ ...event, ...capturedBody });
        }),
      );

      renderWithClient(event);
      (await screen.findByTestId("reactivate-event-button")).click();

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      await waitFor(() => expect(capturedBody).toEqual({ is_active: true }));
      await waitFor(() => expect(screen.getByText("Tu evento volvió a estar activo.")).toBeInTheDocument());
    });
  });
});
