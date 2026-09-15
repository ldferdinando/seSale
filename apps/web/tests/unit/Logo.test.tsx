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
});
