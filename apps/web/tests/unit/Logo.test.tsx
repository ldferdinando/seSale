import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Logo } from "@/components/Logo";

/**
 * Etapa "Logo: usar la imagen original en vez del texto animado con CSS".
 * `<Logo>` centraliza el markup que antes estaba duplicado en Navbar.tsx y
 * ProximamenteContent.tsx. El logo dejó de ser texto real ("se"/"SALE")
 * para pasar a ser el asset de imagen original (apps/web/public/logo-sesale.png)
 * dentro de un <svg role="img">, así que estos tests ya no buscan el texto
 * como contenido accesible — verifican el equivalente accesible de la
 * imagen (role="img" + aria-label/<title>) y el tamaño intrínseco del
 * <svg> por tamaño. Ver a_revisar.md.
 */
describe("Logo", () => {
  it("renders the seSale wordmark, accessible by its label", () => {
    render(<Logo />);

    const logo = screen.getByRole("img", { name: "seSale" });
    expect(logo).toBeInTheDocument();
    expect(logo.tagName.toLowerCase()).toBe("svg");
  });

  it("uses the larger intrinsic size when size='lg'", () => {
    render(<Logo size="lg" />);

    expect(screen.getByRole("img", { name: "seSale" }).getAttribute("class")).toContain(
      "h-[48px]",
    );
  });

  it("defaults to the small (Navbar) intrinsic size", () => {
    render(<Logo />);

    expect(screen.getByRole("img", { name: "seSale" }).getAttribute("class")).toContain(
      "h-[30px]",
    );
  });

  // Etapa "Ajustes de diseño reportados" — tone="light" usa el asset con
  // el glyph "se" recoloreado a blanco (logo-sesale-light.png), para fondos
  // oscuros fijos (ej. el hero de "¿Qué es seSale?"), donde el "se" original
  // (gris casi negro) no se distinguía del fondo.
  it("uses the white-'se' asset when tone='light'", () => {
    const { container } = render(<Logo tone="light" />);

    const image = container.querySelector('[data-testid="logo-image"]');
    expect(image?.getAttribute("href")).toBe("/logo-sesale-light.png");
  });

  it("defaults to the dark-'se' asset (tone='dark')", () => {
    const { container } = render(<Logo />);

    const image = container.querySelector('[data-testid="logo-image"]');
    expect(image?.getAttribute("href")).toBe("/logo-sesale.png");
  });
});
