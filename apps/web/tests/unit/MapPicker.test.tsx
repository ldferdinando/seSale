import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { MapPicker, type MapPickerCoords } from "@/components/MapPicker";

vi.mock("@/lib/nominatim", () => ({
  reverseGeocode: vi.fn().mockResolvedValue(null),
  searchAddress: vi.fn().mockResolvedValue([]),
}));

describe("MapPicker", () => {
  it("renders without errors with no coordinates", () => {
    const { container } = render(<MapPicker latitude={null} longitude={null} onLocationSelect={() => {}} />);

    expect(container.querySelector(".leaflet-container")).not.toBeNull();
  });

  it("renders without errors with coordinates", () => {
    const { container } = render(
      <MapPicker latitude={-39.03} longitude={-67.58} onLocationSelect={() => {}} />,
    );

    expect(container.querySelector(".leaflet-container")).not.toBeNull();
  });

  it("shows the search input when not readonly", () => {
    render(<MapPicker latitude={null} longitude={null} onLocationSelect={() => {}} />);

    expect(screen.getByPlaceholderText("Buscar dirección...")).toBeInTheDocument();
  });

  it("readonly does not show the search input", () => {
    render(<MapPicker latitude={-39.03} longitude={-67.58} onLocationSelect={() => {}} readonly />);

    expect(screen.queryByPlaceholderText("Buscar dirección...")).not.toBeInTheDocument();
  });

  it("clicking the map moves the pin and notifies the picked coordinates (bug real: antes solo se podía arrastrar el pin)", async () => {
    const onLocationSelect = vi.fn();
    const { container } = render(
      <MapPicker latitude={null} longitude={null} onLocationSelect={onLocationSelect} />,
    );

    const mapContainer = container.querySelector(".leaflet-container") as HTMLElement;
    mapContainer.click();

    expect(onLocationSelect).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: expect.any(Number), longitude: expect.any(Number) }),
    );
  });

  it("always notifies the latest onLocationSelect version, not the one captured when the map first mounted", async () => {
    // Bug real reportado: el mapa se monta una sola vez, así que el
    // dragend/click handler cerraba sobre la versión de onLocationSelect
    // (y lo que ella cerraba a su vez, ej. la dirección tipeada) vigente
    // en ESE momento — si el consumidor cambiaba de handler en un render
    // posterior (ej. porque cerraba sobre un valor de estado más nuevo),
    // el mapa seguía notificando con el handler viejo.
    function Wrapper() {
      const [label, setLabel] = useState("first");
      const [received, setReceived] = useState<string[]>([]);
      const onLocationSelect = (coords: MapPickerCoords) => {
        setReceived((prev) => [...prev, `${label}:${coords.latitude}`]);
      };
      return (
        <div>
          <button type="button" onClick={() => setLabel("second")}>
            Cambiar label
          </button>
          <ul>
            {received.map((entry, i) => (
              <li key={i}>{entry}</li>
            ))}
          </ul>
          <MapPicker latitude={null} longitude={null} onLocationSelect={onLocationSelect} />
        </div>
      );
    }

    const user = userEvent.setup();
    const { container } = render(<Wrapper />);
    await user.click(screen.getByText("Cambiar label"));

    const mapContainer = container.querySelector(".leaflet-container") as HTMLElement;
    await user.click(mapContainer);

    expect(await screen.findByText(/^second:/)).toBeInTheDocument();
  });
});
