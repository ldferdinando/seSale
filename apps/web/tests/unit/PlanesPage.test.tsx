import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSearchParams } from "next/navigation";
import { describe, expect, it, vi } from "vitest";

import PlanesPage from "@/app/planes/page";

const EVENT_ID = "11111111-1111-1111-1111-111111111111";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

function renderWithClient() {
  vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams({ event_id: EVENT_ID }) as never);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PlanesPage />
    </QueryClientProvider>,
  );
}

describe("PlanesPage", () => {
  it("muestra el evento a destacar y los planes con precios desde la API", async () => {
    renderWithClient();

    expect(await screen.findByText("Noche de Rock Nacional")).toBeInTheDocument();
    expect(await screen.findByText("Gratuito")).toBeInTheDocument();
    expect(screen.getByText("Destacado")).toBeInTheDocument();
    expect(screen.getByText("Destacado Plus")).toBeInTheDocument();
    expect(screen.getByText("$3.500")).toBeInTheDocument();
  });

  it("sin event_id en la URL pide elegir un evento desde Mis eventos", async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as never);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <PlanesPage />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("link", { name: /Mis eventos/i })).toHaveAttribute("href", "/mis-eventos");
  });

  it("el plan gratis muestra 'Tu plan actual' deshabilitado", async () => {
    renderWithClient();

    const button = await screen.findByRole("button", { name: /Tu plan actual/i });
    expect(button).toBeDisabled();
  });

  it("el plan banner muestra 'Consultar' en vez de 'Contratar'", async () => {
    renderWithClient();

    expect(await screen.findByText("Banner web")).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: /Consultar/i });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute("href", expect.stringContaining("wa.me"));
  });

  it("al hacer click en Contratar redirige a init_point", async () => {
    const originalLocation = window.location;
    // @ts-expect-error jsdom no permite navegación real; reemplazamos el objeto por uno espiable
    delete window.location;
    window.location = { ...originalLocation, href: "" };

    const user = userEvent.setup();
    renderWithClient();

    const contratarButtons = await screen.findAllByRole("button", { name: /Contratar/i });
    await user.click(contratarButtons[0]);

    await waitFor(() =>
      expect(window.location.href).toBe("https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-123"),
    );

    window.location = originalLocation;
  });
});
