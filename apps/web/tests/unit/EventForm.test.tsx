import { HttpResponse, http } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { format } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EventForm } from "@/features/events/components/EventForm";
import { renderWithActiveCity } from "./test-utils";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

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
  await user.click(screen.getByRole("button", { name: "Fecha inicio" }));
  await user.click(screen.getByRole("button", { name: "Mes siguiente" }));
  const days = screen.getAllByText("15", { selector: "button" });
  await user.click(days[0]);
}

/** Elige el día 1 de dos meses atrás para "Fecha fin" — siempre queda
 * antes que "Fecha inicio" (elegida con pickFutureDate), sin depender de
 * la fecha del sistema. */
async function pickPastEndDate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Fecha fin" }));
  await user.click(screen.getByRole("button", { name: "Mes anterior" }));
  await user.click(screen.getByRole("button", { name: "Mes anterior" }));
  const days = screen.getAllByText("1", { selector: "button" });
  await user.click(days[0]);
}

async function fillRequiredFieldsExceptCategory(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Nombre del evento/), "Mi evento de prueba");
  await pickFutureDate(user);
  await selectTime(user, "Hora inicio", "21", "00");
  await selectTime(user, "Hora fin", "23", "00");
  await user.click(screen.getByRole("tab", { name: "Indicar en el mapa" }));
  await user.type(screen.getByLabelText("Nombre del lugar"), "El Tinglado Bar");
  await user.type(screen.getByLabelText(/Dirección/), "Av. Roca 1240");
  // Clickear el mapa marca las coordenadas (obligatorias en modo "map" —
  // ver event-schema.ts, bug real reportado: sin esto el evento se
  // guardaba sin latitude/longitude).
  const mapContainer = document.querySelector(".leaflet-container");
  if (mapContainer) await user.click(mapContainer);
}

// Etapa 12a: las categorías se cargan de forma asíncrona (GET
// /api/categories) — CategoryMultiSelect muestra un skeleton hasta que
// resuelve, así que hay que esperar el checkbox con findByLabelText en vez
// de asumirlo presente de entrada. Además, si la categoría tiene emoji, el
// label ahora es "🎵 Música en vivo" (no solo el nombre) — se matchea con
// una regex parcial para no depender del emoji exacto.
async function toggleCategory(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(await screen.findByLabelText(new RegExp(label)));
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
    // Etapa 12a: categorías cargadas de forma asíncrona — CategoryMultiSelect
    // muestra un skeleton hasta que resuelve GET /api/categories.
    expect(await screen.findByRole("group", { name: "Categorías" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fecha inicio" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fecha fin" })).toBeInTheDocument();
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

  it("does not call the API — Continuar pasa los datos cargados a onContinue", async () => {
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
    const [payload] = onContinue.mock.calls[0];
    expect(payload).toMatchObject({
      title: "Mi evento de prueba",
      date: expectedDate,
      time: "21:00",
      time_end: "23:00",
      date_end: expectedDate, // Etapa 10b — auto-completado, mismo día (no cruza medianoche)
      location_data: expect.objectContaining({
        name: "El Tinglado Bar",
        address: "Av. Roca 1240",
      }),
      categories: ["musica"],
    });
  });

  it("no tiene selector de plan — la visibilidad se elige en el resumen (Etapa 9b)", async () => {
    renderWithClient();

    expect(screen.queryByText("Elegí tu plan")).not.toBeInTheDocument();
    expect(screen.queryByText("Destacado Plus")).not.toBeInTheDocument();
  });

  it("limits category selection to 3 and disables the rest", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await toggleCategory(user, "Música en vivo");
    await toggleCategory(user, "Fiesta / Baile");
    await toggleCategory(user, "Teatro");

    const feriaCheckbox = screen.getByLabelText(/Feria/) as HTMLInputElement;
    expect(feriaCheckbox).toBeDisabled();

    const musicaCheckbox = screen.getByLabelText(/Música en vivo/) as HTMLInputElement;
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

  // Etapa 10a — time_end pasa de opcional a obligatorio

  it("muestra error si se envía sin elegir ninguna hora", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await user.type(screen.getByLabelText(/Nombre del evento/), "Mi evento de prueba");
    await pickFutureDate(user);
    // Sin elegir "Hora inicio" a propósito — con eso, "Hora fin"/"Fecha
    // fin" quedan vacíos (Etapa 10b: el auto-completado recién arranca
    // cuando se elige la hora de inicio).
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByText("La hora de fin es requerida")).toBeInTheDocument();
  });

  it("muestra error si la hora de fin queda igual a la de inicio", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await user.type(screen.getByLabelText(/Nombre del evento/), "Mi evento de prueba");
    await pickFutureDate(user);
    await selectTime(user, "Hora inicio", "21", "00");
    await selectTime(user, "Hora fin", "21", "00");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByText("La fecha y hora de fin debe ser posterior al inicio")).toBeInTheDocument();
  });

  it("muestra error si la hora de fin (mismo día) queda ANTES que la de inicio", async () => {
    // Bug real reportado: "muestra error si la hora de fin queda igual a
    // la de inicio" solo cubría el caso == — un time_end "distinto" pero
    // ANTERIOR (ej. 18:00 con inicio 21:00, mismo día) pasaba la
    // validación sin error.
    const user = userEvent.setup();
    renderWithClient();

    await user.type(screen.getByLabelText(/Nombre del evento/), "Mi evento de prueba");
    await pickFutureDate(user);
    await selectTime(user, "Hora inicio", "21", "00");
    await selectTime(user, "Hora fin", "18", "00"); // mismo día, pero antes de la de inicio
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByText("La fecha y hora de fin debe ser posterior al inicio")).toBeInTheDocument();
  });

  it("no muestra error de hora de fin con una combinación válida", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await fillRequiredFieldsExceptCategory(user);
    await toggleCategory(user, "Música en vivo");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.queryByText("La hora de fin es requerida")).not.toBeInTheDocument();
    expect(screen.queryByText("La fecha y hora de fin debe ser posterior al inicio")).not.toBeInTheDocument();
  });

  // Etapa 10b — date_end + defaults automáticos de fecha/hora de fin

  it("completa automáticamente hora fin (+1h) y fecha fin (mismo día) al elegir la hora de inicio", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await pickFutureDate(user);
    await selectTime(user, "Hora inicio", "21", "00");

    expect(screen.getByLabelText("Hora fin — hora")).toHaveTextContent("22");
    expect(screen.getByLabelText("Hora fin — minutos")).toHaveTextContent("00");
    // "Fecha fin" muestra la misma fecha que "Fecha inicio" (no cruza medianoche).
    const startDateText = screen.getByRole("button", { name: "Fecha inicio" }).textContent;
    expect(screen.getByRole("button", { name: "Fecha fin" })).toHaveTextContent(startDateText ?? "");
  });

  it("también completa la fecha fin si se elige la hora de inicio ANTES que la fecha de inicio", async () => {
    // Bug real reportado: en este orden, "Fecha fin" quedaba vacía para
    // siempre (el efecto de "Hora inicio" no podía completarla porque
    // todavía no había "Fecha inicio" de referencia).
    const user = userEvent.setup();
    renderWithClient();

    await selectTime(user, "Hora inicio", "21", "00");
    await pickFutureDate(user);

    const startDateText = screen.getByRole("button", { name: "Fecha inicio" }).textContent;
    expect(screen.getByRole("button", { name: "Fecha fin" })).toHaveTextContent(startDateText ?? "");
    expect(screen.getByLabelText("Hora fin — hora")).toHaveTextContent("22");
  });

  it("completa la fecha fin al día siguiente si la hora de inicio (elegida antes que la fecha) cruza medianoche", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await selectTime(user, "Hora inicio", "23", "30");
    await pickFutureDate(user);

    const startDateText = screen.getByRole("button", { name: "Fecha inicio" }).textContent;
    expect(screen.getByRole("button", { name: "Fecha fin" })).not.toHaveTextContent(startDateText ?? "");
    expect(screen.getByLabelText("Hora fin — hora")).toHaveTextContent("00");
    expect(screen.getByLabelText("Hora fin — minutos")).toHaveTextContent("30");
  });

  it("si el horario de inicio cruza medianoche, la fecha de fin pasa a ser el día siguiente", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await pickFutureDate(user);
    const startDateText = screen.getByRole("button", { name: "Fecha inicio" }).textContent;

    await selectTime(user, "Hora inicio", "23", "30");

    expect(screen.getByLabelText("Hora fin — hora")).toHaveTextContent("00");
    expect(screen.getByLabelText("Hora fin — minutos")).toHaveTextContent("30");
    expect(screen.getByRole("button", { name: "Fecha fin" })).not.toHaveTextContent(startDateText ?? "");
  });

  it("no pisa la hora de fin si ya fue modificada a mano, aunque cambie la hora de inicio", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await pickFutureDate(user);
    await selectTime(user, "Hora inicio", "21", "00");
    await selectTime(user, "Hora fin", "23", "45"); // modificado a mano

    // Cambiar la hora de inicio de nuevo NO debe recalcular la hora de fin.
    await selectTime(user, "Hora inicio", "20", "00");

    expect(screen.getByLabelText("Hora fin — hora")).toHaveTextContent("23");
    expect(screen.getByLabelText("Hora fin — minutos")).toHaveTextContent("45");
  });

  it("muestra error si la fecha de fin queda antes que la fecha de inicio", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await user.type(screen.getByLabelText(/Nombre del evento/), "Mi evento de prueba");
    await pickFutureDate(user);
    await selectTime(user, "Hora inicio", "21", "00");
    await selectTime(user, "Hora fin", "23", "00");
    // Fuerza "Fecha fin" a un valor inválido (antes que "Fecha inicio").
    await pickPastEndDate(user);

    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByText("La fecha y hora de fin debe ser posterior al inicio")).toBeInTheDocument();
  });

  // Etapa 12a — categorías dinámicas (GET /api/categories).
  it("shows a checkbox skeleton while categories are loading", async () => {
    server.use(
      http.get(`${API_URL}/api/categories`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return HttpResponse.json([{ id: "1", key: "musica", name: "Música en vivo", emoji: "🎵", color: null, sort_order: 1 }]);
      }),
    );
    renderWithClient();

    expect(screen.getByTestId("category-multiselect-loading")).toBeInTheDocument();
    expect(await screen.findByLabelText(/Música en vivo/)).toBeInTheDocument();
  });

  it("falls back to the hardcoded category list if GET /api/categories fails", async () => {
    server.use(http.get(`${API_URL}/api/categories`, () => HttpResponse.json({ detail: "error" }, { status: 500 })));
    renderWithClient();

    expect(await screen.findByLabelText(/Música en vivo/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Deportes/)).toBeInTheDocument();
  });
});
