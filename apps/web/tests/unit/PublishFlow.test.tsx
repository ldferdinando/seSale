import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { PublishFlow } from "@/features/events/components/PublishFlow";

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PublishFlow />
    </QueryClientProvider>,
  );
}

/** Elige el día 15 del mes siguiente al actual — siempre en el futuro, sin depender de la fecha del sistema. */
async function pickFutureDate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Elegir fecha" }));
  await user.click(screen.getByRole("button", { name: "Mes siguiente" }));
  const days = screen.getAllByText("15", { selector: "button" });
  await user.click(days[0]);
}

async function selectTime(user: ReturnType<typeof userEvent.setup>, fieldLabel: string, hour: string, minute: string) {
  await user.click(screen.getByLabelText(`${fieldLabel} — hora`));
  await user.click(await screen.findByRole("option", { name: hour }));
  await user.click(screen.getByLabelText(`${fieldLabel} — minutos`));
  await user.click(await screen.findByRole("option", { name: minute }));
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Nombre del evento/), "Mi evento de prueba");
  await pickFutureDate(user);
  await selectTime(user, "Hora inicio", "21", "00");
  await user.type(screen.getByLabelText(/Nombre del lugar/), "El Tinglado Bar");
  await user.type(screen.getByLabelText(/Dirección/), "Av. Roca 1240");
  await user.click(screen.getByLabelText("Música en vivo"));
}

describe("PublishFlow", () => {
  beforeEach(() => {
    push.mockClear();
    window.localStorage.clear();
  });

  it("Continuar navega al resumen y con plan gratuito Publicar redirige a /mis-eventos", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /Gratuito/ }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByText("Mi evento de prueba")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Publicar/ }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/mis-eventos?published=1"));
  });

  it("con un plan pago, Publicar en el resumen igual publica el evento (queda pending)", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await fillRequiredFields(user);
    // "Destacado" ya viene seleccionado por defecto.
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByText("Mi evento de prueba")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Publicar/ }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/mis-eventos?published=1"));
  });

  it("Editar datos vuelve al formulario conservando lo cargado", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    await screen.findByText("Mi evento de prueba");
    await user.click(screen.getByRole("button", { name: /Editar datos/ }));

    expect(await screen.findByLabelText(/Nombre del evento/)).toHaveValue("Mi evento de prueba");
  });
});
