import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { EventSummaryView } from "@/features/events/components/EventSummaryView";
import type { EventCreateInput } from "@/features/events/types";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

const payload: EventCreateInput = {
  title: "Noche de Jazz en vivo",
  description: "Una noche con la mejor banda de jazz de la ciudad",
  date: "2099-05-20",
  time: "21:00",
  time_end: "23:30",
  date_end: "2099-05-20",
  categories: ["musica"],
  location_data: { name: "El Tinglado Bar", address: "Av. Roca 1240", city_id: "city-1" },
  ticket_type: "pago",
  price_at_door: 3000,
  contact_instagram: "@eltingladobar",
  available_on_site: true,
};

function renderSummary(overrides: Partial<React.ComponentProps<typeof EventSummaryView>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onBack = vi.fn();
  const onPublished = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <EventSummaryView payload={payload} onBack={onBack} onPublished={onPublished} {...overrides} />
    </QueryClientProvider>,
  );
  return { onBack, onPublished };
}

describe("EventSummaryView", () => {
  it("muestra los datos cargados del evento", () => {
    renderSummary();

    expect(screen.getByText("Noche de Jazz en vivo")).toBeInTheDocument();
    expect(screen.getByText("El Tinglado Bar")).toBeInTheDocument();
    expect(screen.getByText("Av. Roca 1240")).toBeInTheDocument();
    expect(screen.getByText("Música en vivo")).toBeInTheDocument();
    expect(screen.getByText("21:00 a 23:30 hs")).toBeInTheDocument();
    expect(screen.getByText("Puerta: $3.000")).toBeInTheDocument();
  });

  it("muestra la sección 'Elegí visibilidad' con los tres planes desde GET /api/plans", async () => {
    renderSummary();

    expect(screen.getByText("Elegí visibilidad")).toBeInTheDocument();
    expect(await screen.findByText("Gratuito")).toBeInTheDocument();
    expect(screen.getByText("Destacado")).toBeInTheDocument();
    expect(screen.getByText("Destacado Plus")).toBeInTheDocument();
    // El precio viene de la API (mockeado en handlers.ts), no está hardcodeado.
    expect(screen.getByText("$3.500/mes")).toBeInTheDocument();
    // El plan Banner no es una opción de visibilidad de evento.
    expect(screen.queryByText("Banner web")).not.toBeInTheDocument();
  });

  it("muestra el texto aclaratorio de revisión", () => {
    renderSummary();

    expect(
      screen.getByText(/Todos los eventos pasan por revisión antes de publicarse/),
    ).toBeInTheDocument();
  });

  it("'Publicar gratis' crea el evento con plan=gratis y avisa con onPublished", async () => {
    let capturedBody: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_URL}/api/events`, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: "new-event", plan: "gratis" }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    const { onPublished } = renderSummary();

    await user.click(await screen.findByRole("button", { name: "Publicar gratis" }));

    await waitFor(() => expect(onPublished).toHaveBeenCalledTimes(1));
    expect(capturedBody).not.toBeNull();
    expect(capturedBody!.plan).toBe("gratis");
  });

  it("'Contratar Destacado' muestra las opciones de pago (MercadoPago y transferencia)", async () => {
    const originalLocation = window.location;
    // @ts-expect-error jsdom no permite navegación real; reemplazamos el objeto por uno espiable
    delete window.location;
    window.location = { ...originalLocation, href: "" };

    const user = userEvent.setup();
    renderSummary();

    await user.click(await screen.findByRole("button", { name: "Contratar Destacado" }));

    await waitFor(() =>
      expect(window.location.href).toBe("https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-123"),
    );

    window.location = originalLocation;
  });

  it("'Ya hice una transferencia' navega a /planes/transferencia con el evento recién creado", async () => {
    const user = userEvent.setup();
    renderSummary();

    const transferButtons = await screen.findAllByRole("button", { name: "Ya hice una transferencia" });
    await user.click(transferButtons[0]);

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(expect.stringMatching(/^\/planes\/transferencia\?plan_id=.+&event_id=.+/)),
    );
  });

  it("vuelve al formulario al hacer click en Editar datos", async () => {
    const user = userEvent.setup();
    const { onBack } = renderSummary();

    await user.click(screen.getByRole("button", { name: /Editar datos/ }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("muestra un error si falla la publicación gratuita", async () => {
    server.use(
      http.post(`${API_URL}/api/events`, () => HttpResponse.json({ detail: "Organizador no encontrado" }, { status: 404 })),
    );
    const user = userEvent.setup();
    renderSummary();

    await user.click(await screen.findByRole("button", { name: "Publicar gratis" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Organizador no encontrado"));
  });
});
