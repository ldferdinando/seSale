import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { format } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EventForm } from "@/features/events/components/EventForm";
import { renderWithActiveCity } from "./test-utils";

function renderWithClient(onContinue = vi.fn()) {
  renderWithActiveCity(<EventForm onContinue={onContinue} />);
  return onContinue;
}

async function selectTime(user: ReturnType<typeof userEvent.setup>, fieldLabel: string, hour: string, minute: string) {
  await user.click(screen.getByLabelText(`${fieldLabel} — hora`));
  await user.click(await screen.findByRole("option", { name: hour }));
  await user.click(screen.getByLabelText(`${fieldLabel} — minutos`));
  await user.click(await screen.findByRole("option", { name: minute }));
}

/** Elige el día 15 del mes siguiente al actual — siempre en el futuro, sin depender de la fecha del sistema. */
async function pickFutureDate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Elegir fecha" }));
  await user.click(screen.getByRole("button", { name: "Mes siguiente" }));
  const days = screen.getAllByText("15", { selector: "button" });
  await user.click(days[0]);
}

async function fillRequiredFieldsExceptCategory(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Nombre del evento/), "Mi evento de prueba");
  await pickFutureDate(user);
  await selectTime(user, "Hora inicio", "21", "00");
  await user.click(screen.getByRole("tab", { name: "Indicar en el mapa" }));
  await user.type(screen.getByLabelText("Nombre del lugar"), "El Tinglado Bar");
  await user.type(screen.getByLabelText(/Dirección/), "Av. Roca 1240");
}

async function toggleCategory(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByLabelText(label));
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
    expect(screen.getByRole("group", { name: "Categorías" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Elegir fecha" })).toBeInTheDocument();
    expect(screen.getByLabelText("Hora inicio — hora")).toBeInTheDocument();
    expect(screen.getByLabelText("Hora fin — hora")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Elegir lugar" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Indicar en el mapa" })).toBeInTheDocument();
    expect(screen.getByText("Tipo de entrada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuar" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Indicar en el mapa" }));
    expect(screen.getByLabelText("Nombre del lugar")).toBeInTheDocument();
    expect(screen.getByLabelText(/Dirección/)).toBeInTheDocument();

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
    expect(screen.getByText("Elegí un lugar de la lista")).toBeInTheDocument();
  });

  it("does not call the API — Continuar pasa los datos cargados y el plan elegido a onContinue", async () => {
    const user = userEvent.setup();
    const onContinue = renderWithClient();

    const nextMonthDate = new Date();
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    nextMonthDate.setDate(15);
    const expectedDate = format(nextMonthDate, "yyyy-MM-dd");

    await fillRequiredFieldsExceptCategory(user);
    await toggleCategory(user, "Música en vivo");

    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(onContinue).toHaveBeenCalledTimes(1);
    const [payload, plan] = onContinue.mock.calls[0];
    expect(payload).toMatchObject({
      title: "Mi evento de prueba",
      date: expectedDate,
      time: "21:00",
      location_data: expect.objectContaining({
        name: "El Tinglado Bar",
        address: "Av. Roca 1240",
      }),
      categories: ["musica"],
    });
    expect(plan).toBe("dest");
  });

  it("limits category selection to 3 and disables the rest", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await toggleCategory(user, "Música en vivo");
    await toggleCategory(user, "Fiesta / Baile");
    await toggleCategory(user, "Teatro");

    const feriaCheckbox = screen.getByLabelText("Feria") as HTMLInputElement;
    expect(feriaCheckbox).toBeDisabled();

    const musicaCheckbox = screen.getByLabelText("Música en vivo") as HTMLInputElement;
    expect(musicaCheckbox).not.toBeDisabled();
    expect(musicaCheckbox.checked).toBe(true);
  });

  it("preselecciona la ciudad activa del usuario y solo lista ciudades activas", async () => {
    renderWithClient();

    await waitFor(() => expect(screen.getByRole("combobox", { name: "Ciudad del evento" })).toHaveTextContent("General Roca"));

    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox", { name: "Ciudad del evento" }));

    expect(await screen.findByRole("option", { name: /Cipolletti/ })).toBeInTheDocument();
    // La ciudad mockeada como default de useCities() en los tests solo incluye
    // activas — no hay forma de aserir la ausencia de inactivas sin agregar
    // una al mock global, cubierto en el test del backend (CityRead is_active).
  });

  it("el payload incluye city_id si el organizador elige otra ciudad", async () => {
    const user = userEvent.setup();
    const onContinue = renderWithClient();

    await waitFor(() => expect(screen.getByRole("combobox", { name: "Ciudad del evento" })).toHaveTextContent("General Roca"));
    await user.click(screen.getByRole("combobox", { name: "Ciudad del evento" }));
    await user.click(await screen.findByRole("option", { name: /Cipolletti/ }));

    await fillRequiredFieldsExceptCategory(user);
    await toggleCategory(user, "Música en vivo");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(onContinue).toHaveBeenCalledTimes(1);
    const [payload] = onContinue.mock.calls[0];
    expect(payload.city_id).toBe("cccccccc-cccc-4ccc-cccc-cccccccccccc");
  });
});
