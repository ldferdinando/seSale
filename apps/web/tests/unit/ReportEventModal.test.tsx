import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

import { ReportEventModal } from "@/features/events/components/ReportEventModal";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";
const EVENT_ID = "11111111-1111-1111-1111-111111111111";

function renderModal(onClose = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ReportEventModal eventId={EVENT_ID} onClose={onClose} />
    </QueryClientProvider>,
  );
  return onClose;
}

describe("ReportEventModal", () => {
  it("shows a validation error when the text is shorter than 10 characters", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText("Descripción del problema"), "corto");
    await user.type(screen.getByLabelText("Tu teléfono de contacto"), "2984123456");
    await user.click(screen.getByRole("button", { name: "Enviar reporte" }));

    expect(screen.getByRole("alert")).toHaveTextContent("al menos 10 caracteres");
  });

  it("submits successfully and shows a confirmation message", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText("Descripción del problema"), "El evento fue cancelado hace días");
    await user.type(screen.getByLabelText("Tu teléfono de contacto"), "2984123456");
    await user.click(screen.getByRole("button", { name: "Enviar reporte" }));

    expect(await screen.findByText(/Tu reporte fue enviado/)).toBeInTheDocument();
  });

  it("shows a rate limit message on 429", async () => {
    server.use(
      http.post(`${API_URL}/api/events/${EVENT_ID}/report`, () => HttpResponse.json({ detail: "rate limited" }, { status: 429 })),
    );
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText("Descripción del problema"), "El evento fue cancelado hace días");
    await user.type(screen.getByLabelText("Tu teléfono de contacto"), "2984123456");
    await user.click(screen.getByRole("button", { name: "Enviar reporte" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Ya enviaste varios reportes recientemente"),
    );
  });

  it("closes when clicking Cancelar", async () => {
    const user = userEvent.setup();
    const onClose = renderModal();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
