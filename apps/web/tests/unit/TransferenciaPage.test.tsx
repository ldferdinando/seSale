import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { useSearchParams } from "next/navigation";
import { describe, expect, it, vi, beforeEach } from "vitest";

import TransferenciaPage from "@/app/planes/transferencia/page";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";
const DEST_PLAN_ID = "66666666-6666-6666-6666-666666666666";
const EVENT_ID = "11111111-1111-1111-1111-111111111111";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: vi.fn(),
}));

function renderPage(planId = DEST_PLAN_ID, eventId = EVENT_ID) {
  vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams({ plan_id: planId, event_id: eventId }) as never);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TransferenciaPage />
    </QueryClientProvider>,
  );
}

describe("TransferenciaPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it("muestra el plan, el alias de pago y el formulario de aviso", async () => {
    renderPage();

    expect(await screen.findByText("Destacado")).toBeInTheDocument();
    expect(screen.getByText("$3.500")).toBeInTheDocument();
    expect(await screen.findByText("sesale.pagos")).toBeInTheDocument();
    expect(screen.getByText("Alias")).toBeInTheDocument();
    expect(screen.getByLabelText(/Ya enviaste el comprobante/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Avisar que ya hice una transferencia" })).toBeInTheDocument();
  });

  it("copia el alias al portapapeles", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    renderPage();

    await screen.findByText("sesale.pagos");
    await user.click(screen.getByRole("button", { name: "Copiar" }));

    expect(writeText).toHaveBeenCalledWith("sesale.pagos");
    expect(await screen.findByRole("button", { name: "Copiado" })).toBeInTheDocument();
  });

  it("sin alias cargado muestra el fallback de WhatsApp", async () => {
    server.use(http.get(`${API_URL}/api/site-settings`, () => HttpResponse.json({ payment_alias: null })));
    renderPage();

    expect(await screen.findByText("Contactanos por WhatsApp para coordinar el pago.")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Coordinar el pago por WhatsApp/ });
    expect(link.getAttribute("href")).toMatch(/^https:\/\/wa\.me\//);
    expect(screen.queryByText("Alias")).not.toBeInTheDocument();
    // El aviso sigue disponible aunque no haya alias.
    expect(screen.getByRole("button", { name: "Avisar que ya hice una transferencia" })).toBeInTheDocument();
  });

  it("al enviar con éxito navega a /planes/transferencia/enviado", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Destacado");
    await user.click(screen.getByRole("button", { name: "Avisar que ya hice una transferencia" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith(expect.stringContaining("/planes/transferencia/enviado")));
  });

  it("muestra un mensaje inline sin navegar si el servidor devuelve un error", async () => {
    server.use(
      http.post(`${API_URL}/api/subscriptions/transfer`, () =>
        HttpResponse.json({ detail: "Error interno" }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Destacado");
    await user.click(screen.getByRole("button", { name: "Avisar que ya hice una transferencia" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("No pudimos registrar tu aviso"));
    expect(pushMock).not.toHaveBeenCalled();
  });
});
