import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { ThemeToggleButton } from "@/components/layout/ThemeToggleButton";
import { THEME_STORAGE_KEY, ThemeProvider } from "@/features/theme/context/ThemeContext";

/**
 * Etapa "Cambios de diseño TIPO B v2.2" (punto 3 — modo claro/oscuro).
 * Persistencia en localStorage (mismo mecanismo que la ciudad activa, ver
 * ActiveCityContext/city-detection.ts) y aplicación como
 * `data-theme` en `document.body` (consumido por globals.css).
 */
describe("ThemeProvider / useTheme", () => {
  afterEach(() => {
    window.localStorage.clear();
    document.body.removeAttribute("data-theme");
  });

  it('defaults to "dark" (data-theme="dark" on body)', () => {
    render(
      <ThemeProvider>
        <ThemeToggleButton />
      </ThemeProvider>,
    );

    expect(document.body.getAttribute("data-theme")).toBe("dark");
    expect(screen.getByRole("button", { name: /Cambiar a modo claro/ })).toBeInTheDocument();
  });

  it("toggling switches to light, sets data-theme, and persists to localStorage", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggleButton />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: /Cambiar a modo claro/ }));

    expect(document.body.getAttribute("data-theme")).toBe("light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(screen.getByRole("button", { name: /Cambiar a modo oscuro/ })).toBeInTheDocument();
  });

  it("restores the persisted theme on mount", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");

    render(
      <ThemeProvider>
        <ThemeToggleButton />
      </ThemeProvider>,
    );

    expect(document.body.getAttribute("data-theme")).toBe("light");
  });

  it("toggling back and forth returns to dark", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggleButton />
      </ThemeProvider>,
    );

    const button = () => screen.getByRole("button");
    await user.click(button());
    await user.click(button());

    expect(document.body.getAttribute("data-theme")).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });
});
