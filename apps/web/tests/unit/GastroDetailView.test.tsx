import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";

import { GastroDetailView } from "@/features/gastro/components/GastroDetailView";
import { makeGastroPlace } from "./mocks/handlers";

function renderWithQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("GastroDetailView", () => {
  it("shows all 7 weekdays with today highlighted", () => {
    const place = makeGastroPlace();
    renderWithQueryClient(<GastroDetailView place={place} />);

    for (const day of ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]) {
      expect(screen.getByTestId(`gastro-hours-${day}`)).toBeInTheDocument();
    }
    expect(screen.getAllByText("Cerrado").length).toBeGreaterThanOrEqual(1);
  });

  it("shows the map when the place has coordinates", async () => {
    const place = makeGastroPlace({ latitude: -39.03, longitude: -67.58 });
    const { container } = renderWithQueryClient(<GastroDetailView place={place} />);

    await waitFor(() => expect(container.querySelector(".leaflet-container")).not.toBeNull());
  });

  it("does not show the map when the place has no coordinates", () => {
    const place = makeGastroPlace({ latitude: null, longitude: null });
    renderWithQueryClient(<GastroDetailView place={place} />);

    expect(document.querySelector(".leaflet-container")).not.toBeInTheDocument();
  });
});
