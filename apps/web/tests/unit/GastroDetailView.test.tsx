import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("shows the enlargeable cover image only for plan pro", () => {
    const pro = makeGastroPlace({ plan: "pro", cover_img_url: "/covers/foo.jpg" });
    const { unmount } = renderWithQueryClient(<GastroDetailView place={pro} />);
    expect(screen.getByTestId("gastro-cover")).toBeInTheDocument();
    unmount();

    const dest = makeGastroPlace({ plan: "dest", cover_img_url: "/covers/foo.jpg" });
    renderWithQueryClient(<GastroDetailView place={dest} />);
    expect(screen.queryByTestId("gastro-cover")).not.toBeInTheDocument();
  });

  it("opens the lightbox when tapping the cover image on plan pro", async () => {
    const user = userEvent.setup();
    const place = makeGastroPlace({ plan: "pro", cover_img_url: "/covers/foo.jpg" });
    renderWithQueryClient(<GastroDetailView place={place} />);

    await user.click(screen.getByTestId("gastro-cover"));

    expect(screen.getByRole("dialog", { name: place.name })).toBeInTheDocument();
  });

  it("shows the open-now chip reusing the same logic as the card", () => {
    const place = makeGastroPlace({
      opening_hours: {
        lunes: { open: "00:00", close: "23:59" },
        martes: { open: "00:00", close: "23:59" },
        miercoles: { open: "00:00", close: "23:59" },
        jueves: { open: "00:00", close: "23:59" },
        viernes: { open: "00:00", close: "23:59" },
        sabado: { open: "00:00", close: "23:59" },
        domingo: { open: "00:00", close: "23:59" },
      },
    });
    renderWithQueryClient(<GastroDetailView place={place} />);

    expect(screen.getByTestId("gastro-open-now")).toBeInTheDocument();
  });

  it("shows Facebook and phone contact channels only when loaded", () => {
    const withContact = makeGastroPlace({ gastro_facebook: "eltinglado", gastro_phone: "2984123456" });
    const { unmount } = renderWithQueryClient(<GastroDetailView place={withContact} />);
    expect(screen.getByTestId("gastro-facebook-link")).toBeInTheDocument();
    expect(screen.getByTestId("gastro-phone-link")).toHaveTextContent("2984123456");
    unmount();

    const withoutContact = makeGastroPlace({ gastro_facebook: null, gastro_phone: null });
    renderWithQueryClient(<GastroDetailView place={withoutContact} />);
    expect(screen.queryByTestId("gastro-facebook-link")).not.toBeInTheDocument();
    expect(screen.queryByTestId("gastro-phone-link")).not.toBeInTheDocument();
  });

  it("opens the report modal from the report button", async () => {
    const user = userEvent.setup();
    const place = makeGastroPlace();
    renderWithQueryClient(<GastroDetailView place={place} />);

    await user.click(screen.getByTestId("gastro-report-button"));

    expect(screen.getByRole("dialog", { name: "Reportar este lugar" })).toBeInTheDocument();
  });
});
