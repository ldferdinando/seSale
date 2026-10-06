import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ActiveCityProvider } from "@/features/cities/context/ActiveCityContext";
import { useActiveCity } from "@/hooks/useActiveCity";

const GENERAL_ROCA_ID = "22222222-2222-2222-2222-222222222222";
const CIPOLLETTI_ID = "cccccccc-cccc-4ccc-cccc-cccccccccccc";

function Probe() {
  const { activeCity, isLocating, setActiveCity, resetToDetected } = useActiveCity();
  return (
    <div>
      <span data-testid="is-locating">{String(isLocating)}</span>
      <span data-testid="active-city-name">{activeCity?.name ?? ""}</span>
      <button
        type="button"
        onClick={() => setActiveCity({ id: CIPOLLETTI_ID, name: "Cipolletti", province: "Río Negro", emoji: "🌆", is_active: true, sort_order: 1, latitude: -38.9333, longitude: -68.0 })}
      >
        elegir cipolletti
      </button>
      <button type="button" onClick={resetToDetected}>
        resetear
      </button>
    </div>
  );
}

function renderProbe() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ActiveCityProvider>
        <Probe />
      </ActiveCityProvider>
    </QueryClientProvider>,
  );
}

/** GPS controlado a mano: el prompt queda pendiente hasta llamar a resolve/reject. */
function stubPendingGeolocation() {
  let success: PositionCallback | undefined;
  let failure: PositionErrorCallback | undefined;
  const getCurrentPosition = vi.fn((ok: PositionCallback, error?: PositionErrorCallback | null) => {
    success = ok;
    failure = error ?? undefined;
  });
  Object.defineProperty(window.navigator, "geolocation", { value: { getCurrentPosition }, configurable: true });
  return {
    getCurrentPosition,
    resolve: (latitude: number, longitude: number) =>
      act(() => success?.({ coords: { latitude, longitude } } as GeolocationPosition)),
    reject: () => act(() => failure?.({ code: 1 } as GeolocationPositionError)),
  };
}

describe("useActiveCity", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    // jsdom no implementa navigator.geolocation: se vuelve a dejar sin GPS.
    Reflect.deleteProperty(window.navigator, "geolocation");
  });

  it("sin ciudad guardada arranca con la ciudad default sin esperar al GPS", async () => {
    stubPendingGeolocation();
    renderProbe();

    await waitFor(() => expect(screen.getByTestId("active-city-name")).toHaveTextContent("General Roca"));
    // El GPS sigue pendiente (el usuario no respondió el prompt).
    expect(screen.getByTestId("is-locating")).toHaveTextContent("true");
  });

  it("si el GPS resuelve otra ciudad, cambia la ciudad activa y la persiste", async () => {
    const gps = stubPendingGeolocation();
    renderProbe();

    await waitFor(() => expect(screen.getByTestId("active-city-name")).toHaveTextContent("General Roca"));
    await waitFor(() => expect(gps.getCurrentPosition).toHaveBeenCalled());

    gps.resolve(-38.94, -68.01);

    await waitFor(() => expect(screen.getByTestId("active-city-name")).toHaveTextContent("Cipolletti"));
    expect(screen.getByTestId("is-locating")).toHaveTextContent("false");
    expect(window.localStorage.getItem("sesale_selected_city_id")).toBe(CIPOLLETTI_ID);
  });

  it("si el permiso de GPS se rechaza, queda la ciudad default sin estado de carga", async () => {
    const gps = stubPendingGeolocation();
    renderProbe();

    await waitFor(() => expect(gps.getCurrentPosition).toHaveBeenCalled());
    gps.reject();

    await waitFor(() => expect(screen.getByTestId("is-locating")).toHaveTextContent("false"));
    expect(screen.getByTestId("active-city-name")).toHaveTextContent("General Roca");
    expect(window.localStorage.getItem("sesale_selected_city_id")).toBe(GENERAL_ROCA_ID);
  });

  it("si el GPS no responde, al vencer el timeout queda la ciudad default", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const gps = stubPendingGeolocation();
      renderProbe();

      await waitFor(() => expect(gps.getCurrentPosition).toHaveBeenCalled());
      expect(screen.getByTestId("active-city-name")).toHaveTextContent("General Roca");

      await act(() => vi.advanceTimersByTimeAsync(5000));

      await waitFor(() => expect(screen.getByTestId("is-locating")).toHaveTextContent("false"));
      expect(screen.getByTestId("active-city-name")).toHaveTextContent("General Roca");
    } finally {
      vi.useRealTimers();
    }
  });

  it("una elección manual durante la detección le gana al resultado del GPS", async () => {
    const user = userEvent.setup();
    const gps = stubPendingGeolocation();
    renderProbe();

    await waitFor(() => expect(gps.getCurrentPosition).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "elegir cipolletti" }));

    // GPS en General Roca, pero el usuario ya eligió Cipolletti.
    gps.resolve(-39.0333, -67.5833);

    await waitFor(() => expect(screen.getByTestId("is-locating")).toHaveTextContent("false"));
    expect(screen.getByTestId("active-city-name")).toHaveTextContent("Cipolletti");
    expect(window.localStorage.getItem("sesale_selected_city_id")).toBe(CIPOLLETTI_ID);
  });

  it("con ciudad guardada la usa sin pedir GPS", async () => {
    const gps = stubPendingGeolocation();
    window.localStorage.setItem("sesale_selected_city_id", CIPOLLETTI_ID);
    renderProbe();

    await waitFor(() => expect(screen.getByTestId("active-city-name")).toHaveTextContent("Cipolletti"));
    expect(gps.getCurrentPosition).not.toHaveBeenCalled();
    expect(screen.getByTestId("is-locating")).toHaveTextContent("false");
  });

  it("setActiveCity actualiza el estado y persiste en localStorage", async () => {
    const user = userEvent.setup();
    renderProbe();

    await waitFor(() => expect(screen.getByTestId("active-city-name")).toHaveTextContent("General Roca"));

    await user.click(screen.getByRole("button", { name: "elegir cipolletti" }));

    expect(screen.getByTestId("active-city-name")).toHaveTextContent("Cipolletti");
    expect(window.localStorage.getItem("sesale_selected_city_id")).toBe(CIPOLLETTI_ID);
  });

  it("resetToDetected limpia localStorage y vuelve a detectar", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("sesale_selected_city_id", CIPOLLETTI_ID);
    renderProbe();

    await waitFor(() => expect(screen.getByTestId("active-city-name")).toHaveTextContent("Cipolletti"));

    await user.click(screen.getByRole("button", { name: "resetear" }));

    // Sin GPS disponible en jsdom, la re-detección cae al default (General Roca).
    await waitFor(() => expect(screen.getByTestId("active-city-name")).toHaveTextContent("General Roca"));
    expect(window.localStorage.getItem("sesale_selected_city_id")).toBe(GENERAL_ROCA_ID);
  });
});

describe("useActiveCity fuera de un Provider", () => {
  it("tira un error explícito", () => {
    function Broken() {
      useActiveCity();
      return null;
    }

    expect(() => render(<Broken />)).toThrow("useActiveCity debe usarse dentro de <ActiveCityProvider>");
  });
});
