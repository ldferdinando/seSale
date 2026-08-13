import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { ActiveCityProvider } from "@/features/cities/context/ActiveCityContext";
import { useActiveCity } from "@/hooks/useActiveCity";

const CIPOLLETTI_ID = "cccccccc-cccc-4ccc-cccc-cccccccccccc";

function Probe() {
  const { activeCity, isDetecting, setActiveCity, resetToDetected } = useActiveCity();
  return (
    <div>
      <span data-testid="is-detecting">{String(isDetecting)}</span>
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

describe("useActiveCity", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("empieza con isDetecting=true y termina con la ciudad detectada", async () => {
    renderProbe();

    expect(screen.getByTestId("is-detecting")).toHaveTextContent("true");

    await waitFor(() => expect(screen.getByTestId("is-detecting")).toHaveTextContent("false"));
    expect(screen.getByTestId("active-city-name")).toHaveTextContent("General Roca");
  });

  it("setActiveCity actualiza el estado y persiste en localStorage", async () => {
    const user = userEvent.setup();
    renderProbe();

    await waitFor(() => expect(screen.getByTestId("is-detecting")).toHaveTextContent("false"));

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
    expect(window.localStorage.getItem("sesale_selected_city_id")).not.toBe(CIPOLLETTI_ID);
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
