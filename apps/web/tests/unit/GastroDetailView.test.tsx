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
  it("WhatsApp contact link includes a message mentioning seSALE", () => {
    const place = makeGastroPlace({ gastro_whatsapp: "5492984000001", plan: "dest" });
    renderWithQueryClient(<GastroDetailView place={place} />);

    const link = screen.getByText("WhatsApp").closest("a");
    const href = link?.getAttribute("href") ?? "";
    expect(href).toMatch(/^https:\/\/wa\.me\/5492984000001\?text=/);
    expect(decodeURIComponent(href)).toContain("seSALE");
  });

  it("shows all 7 weekdays with today highlighted", () => {
    const place = makeGastroPlace();
    renderWithQueryClient(<GastroDetailView place={place} />);

    for (const day of ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]) {
      expect(screen.getByTestId(`gastro-hours-${day}`)).toBeInTheDocument();
    }
    expect(screen.getAllByText("Cerrado").length).toBeGreaterThanOrEqual(1);
  });

  // Bug reportado: un lugar configurado (opening_hours no es null) pero sin
  // tildar ningún día — los 7 en null, ver emptyOpeningHours() en
  // LocationForm.tsx — mostraba "Hoy: cerrado" junto al toggle Y "Cerrado"
  // en los 7 renglones de la lista semanal. "Sin ningún día cargado" nunca
  // debe mostrar "Cerrado": en vez del bloque de 7 días, un recuadro neutro
  // "Horarios no disponibles" (no queda en blanco, ver pedido de la usuaria).
  it("shows a neutral 'Horarios no disponibles' box instead of the weekly block when no day has hours loaded", () => {
    const place = makeGastroPlace({
      opening_hours: {
        lunes: null,
        martes: null,
        miercoles: null,
        jueves: null,
        viernes: null,
        sabado: null,
        domingo: null,
      },
      hours: null,
    });
    renderWithQueryClient(<GastroDetailView place={place} />);

    expect(screen.queryByTestId("gastro-weekly-hours")).not.toBeInTheDocument();
    expect(screen.queryByTestId("gastro-hours-toggle")).not.toBeInTheDocument();
    expect(screen.queryByText("Cerrado")).not.toBeInTheDocument();
    expect(screen.queryByText("Hoy: cerrado")).not.toBeInTheDocument();
    expect(screen.getByTestId("gastro-hours-unavailable-box")).toBeInTheDocument();
    expect(screen.getByText("Horarios no disponibles")).toBeInTheDocument();
  });

  it("falls back to the free-text `hours` field when opening_hours has no day loaded but `hours` is set", () => {
    const place = makeGastroPlace({
      opening_hours: {
        lunes: null,
        martes: null,
        miercoles: null,
        jueves: null,
        viernes: null,
        sabado: null,
        domingo: null,
      },
      hours: "Mar a dom de 20 a 02 hs",
    });
    renderWithQueryClient(<GastroDetailView place={place} />);

    expect(screen.queryByTestId("gastro-weekly-hours")).not.toBeInTheDocument();
    expect(screen.queryByTestId("gastro-hours-unavailable-box")).not.toBeInTheDocument();
    expect(screen.getByText("Mar a dom de 20 a 02 hs")).toBeInTheDocument();
  });

  it("starts the weekly hours block collapsed and expands on toggle", async () => {
    const user = userEvent.setup();
    const place = makeGastroPlace();
    renderWithQueryClient(<GastroDetailView place={place} />);

    const toggle = screen.getByTestId("gastro-hours-toggle");
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
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
    const pro = makeGastroPlace({ plan: "pro", featured_banner_url: "/featured-banners/foo.jpg" });
    const { unmount } = renderWithQueryClient(<GastroDetailView place={pro} />);
    expect(screen.getByTestId("gastro-cover")).toBeInTheDocument();
    unmount();

    const dest = makeGastroPlace({ plan: "dest", featured_banner_url: "/featured-banners/foo.jpg" });
    renderWithQueryClient(<GastroDetailView place={dest} />);
    expect(screen.queryByTestId("gastro-cover")).not.toBeInTheDocument();
  });

  // Etapa "Lugares destacados temporales": la imagen de la ficha es
  // featured_banner_url (exclusivo de pro), no cover_img_url (portada
  // general, cualquier plan) — confirma que no se confunden los dos campos.
  it("uses featured_banner_url, not cover_img_url, as the enlargeable image", () => {
    const place = makeGastroPlace({
      plan: "pro",
      featured_banner_url: null,
      cover_img_url: "/covers/foo.jpg",
    });
    renderWithQueryClient(<GastroDetailView place={place} />);

    const cover = screen.getByTestId("gastro-cover");
    expect(cover).toBeDisabled();
    expect(cover.querySelector("img")).not.toBeInTheDocument();
  });

  it("opens the lightbox when tapping the cover image on plan pro", async () => {
    const user = userEvent.setup();
    const place = makeGastroPlace({ plan: "pro", featured_banner_url: "/featured-banners/foo.jpg" });
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

  it("renders a type key without style entry using the default style", () => {
    const place = makeGastroPlace({ gastro_types: ["teatro-independiente"] });
    renderWithQueryClient(<GastroDetailView place={place} />);

    expect(screen.getByText("teatro-independiente")).toBeInTheDocument();
  });
});
