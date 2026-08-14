import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EventLocationField } from "@/features/events/components/EventLocationField";

const CITY_ID = "22222222-2222-2222-2222-222222222222";

function renderField(overrides: Partial<React.ComponentProps<typeof EventLocationField>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onModeChange = vi.fn();
  const onLocationIdChange = vi.fn();
  const onMapChange = vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <EventLocationField
        cityId={CITY_ID}
        mode="preset"
        onModeChange={onModeChange}
        locationId={undefined}
        onLocationIdChange={onLocationIdChange}
        mapName=""
        mapAddress=""
        mapLatitude={undefined}
        mapLongitude={undefined}
        onMapChange={onMapChange}
        {...overrides}
      />
    </QueryClientProvider>,
  );
  return { ...utils, onModeChange, onLocationIdChange, onMapChange };
}

describe("EventLocationField", () => {
  it("Tab A (Elegir lugar) shows the preloaded-locations picker", async () => {
    renderField();

    expect(screen.getByPlaceholderText("Buscar por nombre o dirección...")).toBeInTheDocument();
    expect(await screen.findByText("El Tinglado Bar")).toBeInTheDocument();
  });

  it("selecting a location in Tab A shows a readonly map", async () => {
    const user = userEvent.setup();
    const { onLocationIdChange } = renderField();

    await user.click(await screen.findByText("El Tinglado Bar"));

    expect(onLocationIdChange).toHaveBeenCalledWith("33333333-3333-3333-3333-333333333333");
    await waitFor(() => expect(document.querySelector(".leaflet-container")).not.toBeNull());
    // El mapa readonly no tiene input de búsqueda.
    expect(screen.queryByPlaceholderText("Buscar dirección...")).not.toBeInTheDocument();
  });

  it("Tab B (Indicar en el mapa) shows the interactive MapPicker with name/address inputs", async () => {
    const user = userEvent.setup();
    const { onMapChange } = renderField({ mode: "map" });

    expect(screen.getByPlaceholderText("Buscar dirección...")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre del lugar")).toBeInTheDocument();
    expect(screen.getByLabelText(/Dirección/)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Dirección/), "N");

    expect(onMapChange).toHaveBeenCalledWith({ address: "N" });
  });
});
