import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TodayBanner } from "@/features/events/components/TodayBanner";

import { renderWithActiveCity } from "./test-utils";

function renderBanner() {
  return renderWithActiveCity(<TodayBanner onClick={vi.fn()} />);
}

describe("TodayBanner", () => {
  // Etapa 12b — Parte 1: el filtro "¿Qué hay hoy?" ocupa el mismo ancho que
  // los banners wide de arriba (verificado en el navegador: 608px, igual que
  // AdSlots). El <button> es `display:flex` — sin un ancho explícito se
  // encogía a su contenido (~273px). El layout real no es testeable en jsdom
  // (getBoundingClientRect siempre da 0); acá solo se fija la intención.
  it("stretches to the container width (not shrink-to-fit)", () => {
    renderBanner();

    const button = screen.getByRole("button");
    expect(button.className).toContain("w-[calc(100%-2rem)]");
  });

  // Etapa "Labels transversales + orden de filtros" (Parte 4): tercera línea
  // con la ciudad activa, calcada de `#en-loc` en seSALE.html.
  it("shows the active city as a third line", async () => {
    renderBanner();

    await waitFor(() => expect(screen.getByText("General Roca")).toBeInTheDocument());
  });
});
