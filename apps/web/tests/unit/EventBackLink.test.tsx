import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { EventBackLink } from "@/features/events/components/EventBackLink";
import {
  consumeListReturn,
  saveListReturn,
  setLastNavigationWasTraverseForTests,
} from "@/features/events/lib/listReturn";

describe("EventBackLink", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState(null, "", "/eventos/abc");
  });

  it("goes to Home when the event was opened without passing through a list", () => {
    render(<EventBackLink />);
    expect(screen.getByRole("link", { name: /Volver/ })).toHaveAttribute("href", "/");
  });

  it("goes back to the category list it came from and marks the return", async () => {
    saveListReturn("/categorias/musica", 900, {});
    render(<EventBackLink />);

    const link = await screen.findByRole("link", { name: /Volver/ });
    expect(link).toHaveAttribute("href", "/categorias/musica");

    // jsdom no navega: se corta la navegación real después del onClick.
    link.addEventListener("click", (e) => e.preventDefault());
    fireEvent.click(link);
    expect(consumeListReturn("/categorias/musica")?.scrollY).toBe(900);
  });

  it("does not mark the return on ctrl/cmd-click (new tab)", async () => {
    saveListReturn("/", 900, {});
    render(<EventBackLink />);
    const link = await screen.findByRole("link", { name: /Volver/ });
    expect(link).toHaveAttribute("href", "/");

    fireEvent.click(link, { ctrlKey: true });
    expect(consumeListReturn("/")).toBeNull();
  });

  it("arms the return to the origin list, so browser back (history traversal) restores it", async () => {
    saveListReturn("/", 1500, {});
    render(<EventBackLink />);
    await screen.findByRole("link", { name: /Volver/ });

    // Sin llegar por historial (p. ej. logo → Home) no restaura...
    setLastNavigationWasTraverseForTests(false);
    expect(consumeListReturn("/")).toBeNull();
  });

  it("restores when the list is reached by history traversal after the detail armed it", async () => {
    saveListReturn("/", 1500, {});
    render(<EventBackLink />);
    await screen.findByRole("link", { name: /Volver/ });

    setLastNavigationWasTraverseForTests(true);
    expect(consumeListReturn("/")?.scrollY).toBe(1500);
  });
});
