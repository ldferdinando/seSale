import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EventForm } from "@/features/events/components/EventForm";

function renderWithClient(onContinue = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <EventForm onContinue={onContinue} />
    </QueryClientProvider>,
  );
  return onContinue;
}

async function fillRequiredFieldsExceptCategory(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Nombre del evento/), "Mi evento de prueba");
  fireEvent.change(screen.getByLabelText(/Fecha/), { target: { value: "2099-01-01" } });
  fireEvent.change(screen.getByLabelText(/Hora inicio/), { target: { value: "21:00" } });
  await user.type(screen.getByLabelText(/Nombre del lugar/), "El Tinglado Bar");
  await user.type(screen.getByLabelText(/Dirección/), "Av. Roca 1240");
}

async function selectCategory(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByLabelText("Categoría"));
  await user.click(await screen.findByRole("option", { name: label }));
}

describe("EventForm", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders all the fields from the event model", async () => {
    const user = userEvent.setup();
    renderWithClient();

    expect(screen.getByLabelText(/Nombre del evento/)).toBeInTheDocument();
    expect(screen.getByLabelText("Descripción")).toBeInTheDocument();
    expect(screen.getByLabelText("Categoría")).toBeInTheDocument();
    expect(screen.getByText("Momento del evento")).toBeInTheDocument();
    expect(screen.getByLabelText(/Fecha/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hora inicio/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hora fin/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre del lugar/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Dirección/)).toBeInTheDocument();
    expect(screen.getByText("Tipo de entrada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuar" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Pago" }));

    expect(screen.getByText("WhatsApp del organizador")).toBeInTheDocument();
    expect(screen.getByText("Instagram / redes sociales")).toBeInTheDocument();
    expect(screen.getByText("Página web / ticketera externa")).toBeInTheDocument();
    expect(screen.getByText("Email de contacto")).toBeInTheDocument();
    expect(screen.getByText("En el lugar / mapa el día del evento")).toBeInTheDocument();

    await user.click(screen.getByText("Instagram / redes sociales"));
    expect(screen.getByLabelText(/Usuario de Instagram/)).toBeInTheDocument();
  });

  it("shows validation errors when submitting an empty form", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByText("El título es obligatorio")).toBeInTheDocument();
    expect(screen.getByText("La fecha es obligatoria")).toBeInTheDocument();
    expect(screen.getByText("La dirección es obligatoria")).toBeInTheDocument();
  });

  it("does not call the API — Continuar pasa los datos cargados y el plan elegido a onContinue", async () => {
    const user = userEvent.setup();
    const onContinue = renderWithClient();

    await fillRequiredFieldsExceptCategory(user);
    await selectCategory(user, "Música en vivo");

    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(onContinue).toHaveBeenCalledTimes(1);
    const [payload, plan] = onContinue.mock.calls[0];
    expect(payload).toMatchObject({
      title: "Mi evento de prueba",
      date: "2099-01-01",
      time: "21:00",
      location_name: "El Tinglado Bar",
      location_address: "Av. Roca 1240",
      category: "musica",
    });
    expect(plan).toBe("dest");
  });
});
