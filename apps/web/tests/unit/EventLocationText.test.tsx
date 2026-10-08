// Dirección libre (`location_text`): tercer camino para la ubicación de un
// evento, sin Location vinculado — formulario, resumen, card, detalle y mapa.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { EventsMap } from "@/components/EventsMap";
import type { City } from "@/features/auth/types";
import { EventCard } from "@/features/events/components/EventCard";
import { EventDetailView } from "@/features/events/components/EventDetailView";
import { EventForm } from "@/features/events/components/EventForm";
import { EventLocationField } from "@/features/events/components/EventLocationField";
import { EventSummaryView } from "@/features/events/components/EventSummaryView";
import { payloadToFormValues } from "@/features/events/lib/eventPayload";
import { buildEventMapUrl, eventPlaceLabel } from "@/features/events/lib/eventLocation";
import { MOCK_EVENT_LOCATION, makeEvent, makeEventDetail } from "./mocks/handlers";
import { renderWithActiveCity } from "./test-utils";

const ADDRESS = "Mitre 1234, frente a la plaza";

function withQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

function textEvent() {
  return makeEvent({ location_id: null, location: null, location_text: ADDRESS });
}

function textEventDetail() {
  return makeEventDetail({ location_id: null, location: null, location_text: ADDRESS });
}

describe("eventLocation helpers", () => {
  it("eventPlaceLabel usa el nombre del lugar o, si no hay, la dirección libre", () => {
    expect(eventPlaceLabel(makeEvent())).toBe("El Tinglado Bar");
    expect(eventPlaceLabel(textEvent())).toBe(ADDRESS);
  });

  it("buildEventMapUrl busca la dirección libre en Google Maps sumando la ciudad", () => {
    expect(buildEventMapUrl(null, "Mitre 1234", "General Roca")).toBe(
      `https://www.google.com/maps/search/${encodeURIComponent("Mitre 1234, General Roca")}`,
    );
    // No duplica la ciudad si el texto ya la menciona.
    expect(buildEventMapUrl(null, "Mitre 1234, General Roca", "General Roca")).toBe(
      `https://www.google.com/maps/search/${encodeURIComponent("Mitre 1234, General Roca")}`,
    );
    expect(buildEventMapUrl(null, null, "General Roca")).toBeNull();
  });

  it("buildEventMapUrl con un Location mantiene el criterio anterior (coordenadas o dirección)", () => {
    expect(buildEventMapUrl({ ...MOCK_EVENT_LOCATION, latitude: -39.03, longitude: -67.58 }, null)).toContain(
      "destination=-39.03,-67.58",
    );
    expect(buildEventMapUrl(MOCK_EVENT_LOCATION, null)).toContain(encodeURIComponent("Av. Roca 1240"));
  });
});

describe("EventLocationField — modo dirección libre", () => {
  function renderField(overrides: Partial<React.ComponentProps<typeof EventLocationField>> = {}) {
    const onModeChange = vi.fn();
    const onLocationTextChange = vi.fn();
    withQueryClient(
      <EventLocationField
        cityId="22222222-2222-2222-2222-222222222222"
        mode="preset"
        onModeChange={onModeChange}
        locationId={undefined}
        onLocationIdChange={vi.fn()}
        mapName=""
        mapAddress=""
        mapLatitude={undefined}
        mapLongitude={undefined}
        onMapChange={vi.fn()}
        locationText=""
        onLocationTextChange={onLocationTextChange}
        {...overrides}
      />,
    );
    return { onModeChange, onLocationTextChange };
  }

  it("ofrece el fallback debajo de las pestañas y cambia al modo texto", async () => {
    const user = userEvent.setup();
    const { onModeChange } = renderField();

    await user.click(screen.getByRole("button", { name: /No encontrás el lugar\? Escribí la dirección/ }));

    expect(onModeChange).toHaveBeenCalledWith("text");
  });

  it("en modo texto muestra el input con el hint, y las pestañas siguen disponibles para volver", async () => {
    const user = userEvent.setup();
    const { onModeChange, onLocationTextChange } = renderField({ mode: "text" });

    expect(screen.getByText(/calle y altura, o una referencia conocida/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /No encontrás el lugar/ })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Buscar por nombre o dirección...")).not.toBeInTheDocument();
    for (const tab of screen.getAllByRole("tab")) {
      expect(tab).toHaveAttribute("aria-selected", "false");
    }

    await user.type(screen.getByLabelText(/Dirección/), "M");
    expect(onLocationTextChange).toHaveBeenCalledWith("M");

    await user.click(screen.getByRole("tab", { name: "Elegir lugar" }));
    expect(onModeChange).toHaveBeenCalledWith("preset");
  });
});

describe("EventForm — dirección libre", () => {
  it("valida que la dirección no quede vacía en modo texto", async () => {
    const user = userEvent.setup();
    renderWithActiveCity(<EventForm onContinue={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /No encontrás el lugar/ }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByText("Escribí la dirección del evento")).toBeInTheDocument();
  });

  it("limpia la dirección escrita si el organizador cambia de opción", async () => {
    const user = userEvent.setup();
    renderWithActiveCity(<EventForm onContinue={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /No encontrás el lugar/ }));
    await user.type(screen.getByLabelText(/Dirección/), ADDRESS);
    await user.click(screen.getByRole("tab", { name: "Indicar en el mapa" }));
    await user.click(screen.getByRole("button", { name: /No encontrás el lugar/ }));

    expect(screen.getByLabelText(/Dirección/)).toHaveValue("");
  });

  it("payloadToFormValues vuelve al modo texto con la dirección cargada", () => {
    const values = payloadToFormValues({
      title: "x",
      date: "2099-01-01",
      time: "21:00",
      time_end: "23:00",
      date_end: "2099-01-01",
      categories: ["musica"],
      ticket_type: "gratis",
      location_text: ADDRESS,
    });

    expect(values.location_mode).toBe("text");
    expect(values.location_text).toBe(ADDRESS);
  });

  it("precarga el modo texto al editar un evento con dirección libre", () => {
    renderWithActiveCity(
      <EventForm onContinue={vi.fn()} initialValues={{ location_mode: "text", location_text: ADDRESS }} />,
    );

    expect(screen.getByLabelText(/Dirección/)).toHaveValue(ADDRESS);
  });
});

describe("EventSummaryView — dirección libre", () => {
  it("muestra solo la dirección, sin fila de Lugar", () => {
    withQueryClient(
      <EventSummaryView
        payload={{
          title: "Peña",
          date: "2099-05-20",
          time: "21:00",
          time_end: "23:30",
          date_end: "2099-05-20",
          categories: ["musica"],
          ticket_type: "gratis",
          location_text: ADDRESS,
        }}
        onBack={vi.fn()}
        onPublished={vi.fn()}
      />,
    );

    expect(screen.getByText(ADDRESS)).toBeInTheDocument();
    expect(screen.queryByText("Lugar")).not.toBeInTheDocument();
  });
});

describe("EventCard — dirección libre", () => {
  it("muestra la dirección en lugar del nombre del lugar (variante compacta)", () => {
    withQueryClient(<EventCard event={textEvent()} />);

    expect(screen.getByText(ADDRESS)).toBeInTheDocument();
  });

  it("muestra la dirección en la variante pro (con flyer)", () => {
    withQueryClient(<EventCard event={{ ...textEvent(), plan: "pro", flyer_url: "/media/flyer.webp" }} />);

    expect(screen.getByText(ADDRESS)).toBeInTheDocument();
  });
});

describe("EventDetailView — dirección libre", () => {
  it("muestra la dirección como texto, sin ficha de lugar ni mapa embebido", () => {
    const { container } = withQueryClient(<EventDetailView event={textEventDetail()} />);

    expect(screen.queryByTestId("event-location-card")).not.toBeInTheDocument();
    expect(screen.queryByTestId("location-verified-icon")).not.toBeInTheDocument();
    expect(container.querySelector(".leaflet-container")).toBeNull();

    const card = screen.getByTestId("event-location-text-card");
    expect(within(card).getByText(ADDRESS)).toBeInTheDocument();
  });

  it('"Cómo llegar" busca la dirección + ciudad en Google Maps', () => {
    withQueryClient(<EventDetailView event={textEventDetail()} />);

    expect(screen.getByTestId("event-location-map-link")).toHaveAttribute(
      "href",
      `https://www.google.com/maps/search/${encodeURIComponent(`${ADDRESS}, General Roca`)}`,
    );
  });
});

describe("EventsMap — dirección libre", () => {
  const activeCity: City = {
    id: "22222222-2222-2222-2222-222222222222",
    name: "General Roca",
    province: "Río Negro",
    emoji: "🏙️",
    is_active: true,
    sort_order: 1,
    latitude: -39.0333,
    longitude: -67.5833,
  };

  it("no dibuja pin para eventos sin Location, sin romper", () => {
    const withCoords = makeEvent({
      id: "e2",
      location: { ...MOCK_EVENT_LOCATION, latitude: -39.03, longitude: -67.58 },
    });
    const { container } = render(
      <EventsMap events={[{ ...textEvent(), id: "e1" }, withCoords]} activeCity={activeCity} onEventClick={() => {}} />,
    );

    expect(container.querySelectorAll(".leaflet-marker-icon").length).toBe(1);
  });
});
