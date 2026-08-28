import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { PublishFlow } from "@/features/events/components/PublishFlow";
import { renderWithActiveCity } from "./test-utils";

function renderWithClient() {
  return renderWithActiveCity(<PublishFlow />);
}

/** Elige el día 15 del mes siguiente al actual — siempre en el futuro, sin depender de la fecha del sistema. */
async function pickFutureDate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Fecha inicio" }));
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
  await selectTime(user, "Hora fin", "23", "00");
  await user.click(screen.getByRole("tab", { name: "Indicar en el mapa" }));
  await user.type(screen.getByLabelText("Nombre del lugar"), "El Tinglado Bar");
  await user.type(screen.getByLabelText(/Dirección/), "Av. Roca 1240");
  // Clickear el mapa marca las coordenadas (obligatorias en modo "map" —
  // ver event-schema.ts, bug real reportado: sin esto el evento se
  // guardaba sin latitude/longitude).
  const mapContainer = document.querySelector(".leaflet-container");
  if (mapContainer) await user.click(mapContainer);
  // Etapa 12a: categorías dinámicas — CategoryMultiSelect muestra un
  // skeleton hasta que resuelve GET /api/categories, y el label incluye el
  // emoji ("🎵 Música en vivo") — se espera y matchea parcial.
  await user.click(await screen.findByLabelText(/Música en vivo/));
}

describe("PublishFlow", () => {
  beforeEach(() => {
    push.mockClear();
    window.localStorage.clear();
  });

  it("el formulario no tiene selector de plan", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await fillRequiredFields(user);

    expect(screen.queryByText("Elegí tu plan")).not.toBeInTheDocument();
  });

  it("Continuar navega al resumen, que muestra 'Elegir visibilidad'", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByText("Mi evento de prueba")).toBeInTheDocument();
    expect(screen.getByText("Elegí visibilidad")).toBeInTheDocument();
  });

  it("'Publicar gratis' publica el evento y redirige a /mis-eventos", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByText("Mi evento de prueba")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Publicar gratis" }));

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
