import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

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
  categories: ["musica"],
  location_name: "El Tinglado Bar",
  location_address: "Av. Roca 1240",
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
      <EventSummaryView payload={payload} plan="gratis" onBack={onBack} onPublished={onPublished} {...overrides} />
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

  it("con plan gratis: Publicar llama a POST /api/events y avisa con onPublished", async () => {
    const user = userEvent.setup();
    const { onPublished } = renderSummary({ plan: "gratis" });

    await user.click(screen.getByRole("button", { name: /Publicar/ }));

    await waitFor(() => expect(onPublished).toHaveBeenCalledTimes(1));
  });

  it("con plan pago: Publicar también publica el evento (queda pending, plan se contrata después)", async () => {
    const user = userEvent.setup();
    const { onPublished } = renderSummary({ plan: "dest" });

    await user.click(screen.getByRole("button", { name: /Publicar/ }));

    await waitFor(() => expect(onPublished).toHaveBeenCalledTimes(1));
  });

  it("vuelve al formulario al hacer click en Editar datos", async () => {
    const user = userEvent.setup();
    const { onBack } = renderSummary();

    await user.click(screen.getByRole("button", { name: /Editar datos/ }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("muestra un error si falla la publicación", async () => {
    server.use(
      http.post(`${API_URL}/api/events`, () => HttpResponse.json({ detail: "Organizador no encontrado" }, { status: 404 })),
    );
    const user = userEvent.setup();
    renderSummary({ plan: "gratis" });

    await user.click(screen.getByRole("button", { name: /Publicar/ }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Organizador no encontrado"));
  });
});
