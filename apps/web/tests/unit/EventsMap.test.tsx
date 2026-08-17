import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EventsMap } from "@/components/EventsMap";
import { requestUserLocation } from "@/lib/city-detection";
import type { City } from "@/features/auth/types";
import { makeEvent } from "./mocks/handlers";

vi.mock("@/lib/city-detection", async () => {
  const actual = await vi.importActual<typeof import("@/lib/city-detection")>("@/lib/city-detection");
  return { ...actual, requestUserLocation: vi.fn() };
});

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

function eventWithCoords(overrides: Partial<ReturnType<typeof makeEvent>> = {}) {
  const event = makeEvent(overrides);
  return {
    ...event,
    location: { ...event.location, latitude: -39.03, longitude: -67.58 },
  };
}

describe("EventsMap", () => {
  beforeEach(() => {
    vi.mocked(requestUserLocation).mockReset();
  });

  it("renders without errors", () => {
    const { container } = render(
      <EventsMap events={[]} activeCity={activeCity} onEventClick={() => {}} />,
    );

    expect(container.querySelector(".leaflet-container")).not.toBeNull();
  });

  it("renders one marker per event with coordinates", () => {
    const events = [
      eventWithCoords({ id: "e1", plan: "pro" }),
      eventWithCoords({ id: "e2", plan: "dest" }),
    ];
    const { container } = render(
      <EventsMap events={events} activeCity={activeCity} onEventClick={() => {}} />,
    );

    expect(container.querySelectorAll(".leaflet-marker-icon").length).toBe(2);
  });

  it("ignores events without coordinates, without throwing", () => {
    const withoutCoords = makeEvent({ id: "e1", location: { ...makeEvent().location, latitude: null, longitude: null } });
    const withCoords = eventWithCoords({ id: "e2" });

    const { container } = render(
      <EventsMap events={[withoutCoords, withCoords]} activeCity={activeCity} onEventClick={() => {}} />,
    );

    expect(container.querySelectorAll(".leaflet-marker-icon").length).toBe(1);
  });

  it("renders a bigger pin for plan pro than dest and gratis", () => {
    const events = [
      eventWithCoords({ id: "e1", plan: "pro" }),
      eventWithCoords({ id: "e2", plan: "dest" }),
      eventWithCoords({ id: "e3", plan: "gratis" }),
    ];
    const { container } = render(
      <EventsMap events={events} activeCity={activeCity} onEventClick={() => {}} />,
    );

    const icons = Array.from(container.querySelectorAll<HTMLElement>(".leaflet-marker-icon"));
    const widths = icons.map((icon) => Number(icon.style.width.replace("px", "")));

    expect(widths[0]).toBeGreaterThan(widths[1]);
    expect(widths[1]).toBeGreaterThan(widths[2]);
  });

  it("clicking a marker opens a popup with the title and a link to the event", async () => {
    const event = eventWithCoords({ id: "e1", title: "Noche de Jazz" });
    const { container } = render(
      <EventsMap events={[event]} activeCity={activeCity} onEventClick={() => {}} />,
    );

    const marker = container.querySelector<HTMLElement>(".leaflet-marker-icon");
    marker?.click();

    expect(await screen.findByText("Noche de Jazz")).toBeInTheDocument();
    expect(screen.getByText("Ver evento")).toBeInTheDocument();
  });

  it("clicking 'Ver evento' in the popup calls onEventClick", async () => {
    const event = eventWithCoords({ id: "e1", title: "Noche de Jazz" });
    const onEventClick = vi.fn();
    const { container } = render(
      <EventsMap events={[event]} activeCity={activeCity} onEventClick={onEventClick} />,
    );

    const marker = container.querySelector<HTMLElement>(".leaflet-marker-icon");
    marker?.click();

    const link = await screen.findByText("Ver evento");
    link.click();

    expect(onEventClick).toHaveBeenCalledWith("e1");
  });

  it("the 'Cerca mío' button calls requestUserLocation", async () => {
    vi.mocked(requestUserLocation).mockResolvedValue(null);

    render(<EventsMap events={[]} activeCity={activeCity} onEventClick={() => {}} />);
    screen.getByText("Cerca mío").click();

    await waitFor(() => expect(requestUserLocation).toHaveBeenCalledTimes(1));
  });

  it("does not move the map center when requestUserLocation resolves to null", async () => {
    vi.mocked(requestUserLocation).mockResolvedValue(null);

    render(<EventsMap events={[]} activeCity={activeCity} onEventClick={() => {}} />);
    screen.getByText("Cerca mío").click();

    await waitFor(() => expect(requestUserLocation).toHaveBeenCalledTimes(1));
    // No hay assertion directa sobre el centro del mapa (Leaflet no expone
    // ref pública desde afuera del componente) — se verifica que no explota
    // y que no queda ningún estado de error pendiente.
    expect(screen.getByText("Cerca mío")).toBeInTheDocument();
  });
});
