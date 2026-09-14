import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Logo } from "@/components/Logo";

/**
 * Etapa "Cambios de diseño TIPO B v2.2" (punto 1 — logo animado).
 * `<Logo>` centraliza el markup que antes estaba duplicado en Navbar.tsx y
 * ProximamenteContent.tsx — ver a_revisar.md sobre la versión simplificada
 * (CSS puro, sin el SVG con máscara raster del prototipo) de la animación.
 */
describe("Logo", () => {
  it("renders the seSALE wordmark, accessible by its label", () => {
    render(<Logo />);

    expect(screen.getByLabelText("seSALE")).toBeInTheDocument();
    expect(screen.getByText("se")).toBeInTheDocument();
    expect(screen.getByText("SALE")).toBeInTheDocument();
  });

  it("uses the larger text size when size='lg'", () => {
    render(<Logo size="lg" />);

    expect(screen.getByText("se").className).toContain("text-3xl");
  });

  it("defaults to the small (Navbar) text size", () => {
    render(<Logo />);

    expect(screen.getByText("se").className).toContain("text-xl");
  });
});
