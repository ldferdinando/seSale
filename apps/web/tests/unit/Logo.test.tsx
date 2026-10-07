import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Logo } from "@/components/Logo";
import { THEME_STORAGE_KEY, ThemeProvider } from "@/features/theme/context/ThemeContext";

/**
 * Etapa "Logo: usar la imagen original en vez del texto animado con CSS".
 * `<Logo>` centraliza el markup que antes estaba duplicado en Navbar.tsx y
 * ProximamenteContent.tsx. El logo dejó de ser texto real ("se"/"SALE")
 * para pasar a ser el asset de imagen original (apps/web/public/logo-sesale.png)
 * dentro de un <svg role="img">, así que estos tests ya no buscan el texto
 * como contenido accesible — verifican el equivalente accesible de la
 * imagen (role="img" + aria-label/<title>) y el tamaño intrínseco del
 * <svg> por tamaño. Ver a_revisar.md.
 *
 * Etapa "Logo: variante para modo oscuro" — `<Logo>` usa `useTheme()`
 * (default de `ThemeProvider` es "dark"), así que todos los renders acá
 * necesitan el provider, igual que `renderWithActiveCity` en Navbar.test.tsx.
 *
 * Fix "el logo deja de ser el elemento LCP" — el logo base pasó a ser un
 * `<img>` HTML (antes `<image>` dentro de un <svg>) y la animación vive en
 * un overlay SVG que se monta recién después de que el `<img>` cargó y se
 * pintó (dos requestAnimationFrame).
 */
function renderLogo(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe("Logo", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders the seSale wordmark, accessible by its label", () => {
    renderLogo(<Logo />);

    const logo = screen.getByRole("img", { name: "seSale" });
    expect(logo).toBeInTheDocument();
    expect(logo.tagName.toLowerCase()).toBe("img");
  });

  it("uses the larger intrinsic size when size='lg'", () => {
    renderLogo(<Logo size="lg" />);

    expect(screen.getByRole("img", { name: "seSale" }).getAttribute("class")).toContain(
      "h-[48px]",
    );
  });

  it("defaults to the small (Navbar) intrinsic size", () => {
    renderLogo(<Logo />);

    expect(screen.getByRole("img", { name: "seSale" }).getAttribute("class")).toContain(
      "h-[30px]",
    );
  });

  // Etapa "Ajustes de diseño reportados" — tone="light" usa el asset con
  // el glyph "se" recoloreado a blanco (logo-sesale-light.png), para fondos
  // oscuros fijos (ej. el hero de "¿Qué es seSale?"), donde el "se" original
  // (gris casi negro) no se distinguía del fondo. `tone` explícito ignora
  // el tema activo.
  it("uses the fixed white-'se' asset when tone='light'", () => {
    const { container } = renderLogo(<Logo tone="light" />);

    const image = container.querySelector('[data-testid="logo-image"]');
    expect(image?.getAttribute("src")).toBe("/logo-sesale-light.png");
  });

  it("uses the fixed dark-'se' asset when tone='dark'", () => {
    const { container } = renderLogo(<Logo tone="dark" />);

    const image = container.querySelector('[data-testid="logo-image"]');
    expect(image?.getAttribute("src")).toBe("/logo-sesale.png");
  });

  // Etapa "Logo: variante para modo oscuro" — sin `tone`, el asset sigue
  // el tema activo (`ThemeProvider` default "dark" → asset blanco).
  it("defaults to the dark-theme asset when no tone is given (theme='dark')", () => {
    const { container } = renderLogo(<Logo />);

    const image = container.querySelector('[data-testid="logo-image"]');
    expect(image?.getAttribute("src")).toBe("/logo-sesale-dark.png");
  });

  it("uses the light-theme asset when the stored theme is 'light'", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");

    const { container } = renderLogo(<Logo />);

    const image = container.querySelector('[data-testid="logo-image"]');
    expect(image?.getAttribute("src")).toBe("/logo-sesale.png");
  });

  it("renders the full logo with high fetch priority on the first render", () => {
    const { container } = renderLogo(<Logo />);

    const image = container.querySelector('[data-testid="logo-image"]');
    expect(image?.getAttribute("fetchpriority")).toBe("high");
    // Nada que recorte/oculte el logo en el primer render: la animación
    // todavía no está montada.
    expect(container.querySelector('[data-testid="logo-animation"]')).toBeNull();
    expect(container.querySelector("clipPath")).toBeNull();
  });

  it("mounts the animation overlay only after the logo has loaded and painted", () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => undefined);

    const { container } = renderLogo(<Logo />);
    const image = container.querySelector('[data-testid="logo-image"]') as HTMLImageElement;

    expect(frames).toHaveLength(0);
    fireEvent.load(image);
    expect(container.querySelector('[data-testid="logo-animation"]')).toBeNull();

    act(() => frames.shift()?.(0));
    expect(container.querySelector('[data-testid="logo-animation"]')).toBeNull();

    act(() => frames.shift()?.(16));
    const overlay = container.querySelector('[data-testid="logo-animation"]');
    expect(overlay).not.toBeNull();
    expect(overlay?.getAttribute("aria-hidden")).toBe("true");
    expect(overlay?.querySelector(".sesale-logo-reveal-sweep")).not.toBeNull();
    expect(overlay?.querySelector(".sesale-logo-shine-translate")).not.toBeNull();
  });

  it("never mounts the animation overlay with prefers-reduced-motion: reduce", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });

    const { container } = renderLogo(<Logo />);
    fireEvent.load(container.querySelector('[data-testid="logo-image"]') as HTMLImageElement);

    expect(screen.getByRole("img", { name: "seSale" })).toBeInTheDocument();
    expect(container.querySelector('[data-testid="logo-animation"]')).toBeNull();
  });
});
