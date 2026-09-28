import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import LugaresPage from "@/app/lugares/page";
import { renderWithActiveCity } from "./test-utils";

describe("LugaresPage", () => {
  it("shows the type chips, wrapping instead of scrolling", async () => {
    renderWithActiveCity(<LugaresPage />);

    const chips = await screen.findByTestId("gastro-type-chips");
    expect(chips.className).toContain("flex-wrap");
    expect(chips.className).not.toContain("overflow-x-auto");
    expect(screen.getByText("Todos")).toBeInTheDocument();
    expect(screen.getByText("Bares")).toBeInTheDocument();
    expect(screen.getByText("Cervecerías")).toBeInTheDocument();
  });

  it("the active chip has the 'on' styling", async () => {
    renderWithActiveCity(<LugaresPage />);
    const chips = within(await screen.findByTestId("gastro-type-chips"));

    function hasOnClass(el: Element | null): boolean {
      return (el?.className.split(/\s+/) ?? []).includes("on");
    }

    const todosChip = chips.getByText("Todos").closest("button");
    expect(hasOnClass(todosChip)).toBe(true);

    const user = userEvent.setup();
    await user.click(chips.getByText("Bares"));

    expect(hasOnClass(chips.getByText("Bares").closest("button"))).toBe(true);
    expect(hasOnClass(chips.getByText("Todos").closest("button"))).toBe(false);
  });

  it("filters the list when a type chip is selected", async () => {
    const user = userEvent.setup();
    renderWithActiveCity(<LugaresPage />);

    await waitFor(() => expect(screen.getAllByTestId("gastro-place-card").length).toBeGreaterThan(0));
    expect(screen.getByText("El Tinglado Bar")).toBeInTheDocument();
    expect(screen.getByText("La Toscana")).toBeInTheDocument();

    const chips = within(screen.getByTestId("gastro-type-chips"));
    await user.click(chips.getByText("Cafés"));

    await waitFor(() => {
      expect(screen.queryByText("El Tinglado Bar")).not.toBeInTheDocument();
      expect(screen.getByText("La Toscana")).toBeInTheDocument();
    });
  });

  // Etapa "Cambios de diseño TIPO B v2.2" (punto 11 — reposicionamiento de
  // banners en Gastronomía al filtrar).
  describe("reposicionamiento de banners al filtrar", () => {
    function bannersComeBeforePlaces(): boolean {
      const banners = screen.getAllByTestId("banner-slot");
      const places = screen.getAllByTestId("gastro-place-card");
      // DOCUMENT_POSITION_FOLLOWING (4) en banners[last] vs places[0] === el
      // último banner viene ANTES del primer lugar en el documento.
      return Boolean(
        banners[banners.length - 1].compareDocumentPosition(places[0]) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }

    it('with "Todos" (sin filtro de tipo), banners van antes de los resultados', async () => {
      renderWithActiveCity(<LugaresPage />);

      await waitFor(() => expect(screen.getAllByTestId("gastro-place-card").length).toBeGreaterThan(0));
      expect(screen.getAllByTestId("banner-slot").length).toBeGreaterThan(0);
      expect(bannersComeBeforePlaces()).toBe(true);
    });

    it("with a specific type selected, banners move after the results", async () => {
      const user = userEvent.setup();
      renderWithActiveCity(<LugaresPage />);

      await waitFor(() => expect(screen.getAllByTestId("gastro-place-card").length).toBeGreaterThan(0));

      const chips = within(screen.getByTestId("gastro-type-chips"));
      await user.click(chips.getByText("Cafés"));

      await waitFor(() => expect(screen.getAllByTestId("gastro-place-card").length).toBeGreaterThan(0));
      expect(bannersComeBeforePlaces()).toBe(false);
    });

    it("scrolls the results into view when a specific type is selected", async () => {
      const user = userEvent.setup();
      const scrollIntoViewMock = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoViewMock;

      renderWithActiveCity(<LugaresPage />);
      await waitFor(() => expect(screen.getAllByTestId("gastro-place-card").length).toBeGreaterThan(0));

      const chips = within(screen.getByTestId("gastro-type-chips"));
      await user.click(chips.getByText("Cafés"));

      await waitFor(() => expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth", block: "start" }));
    });

    it('going back to "Todos" moves the banners before the results again', async () => {
      const user = userEvent.setup();
      renderWithActiveCity(<LugaresPage />);

      await waitFor(() => expect(screen.getAllByTestId("gastro-place-card").length).toBeGreaterThan(0));

      const chips = within(screen.getByTestId("gastro-type-chips"));
      await user.click(chips.getByText("Cafés"));
      await waitFor(() => expect(bannersComeBeforePlaces()).toBe(false));

      await user.click(chips.getByText("Todos"));
      await waitFor(() => expect(bannersComeBeforePlaces()).toBe(true));
    });
  });

  describe("selector de grupo Gastronomía | Espacios", () => {
    it('defaults to "Gastronomía" and shows only gastro-group chips and places', async () => {
      renderWithActiveCity(<LugaresPage />);

      const selector = within(await screen.findByTestId("lugares-grupo-selector"));
      expect(selector.getByRole("button", { name: /Gastronomía/ })).toHaveAttribute("aria-pressed", "true");
      expect(selector.getByRole("button", { name: /Espacios/ })).toHaveAttribute("aria-pressed", "false");

      const chips = within(screen.getByTestId("gastro-type-chips"));
      expect(chips.getByText("Bares")).toBeInTheDocument();
      expect(chips.queryByText("Clubes")).not.toBeInTheDocument();

      await waitFor(() => expect(screen.getAllByTestId("gastro-place-card").length).toBeGreaterThan(0));
      expect(screen.getByText("El Tinglado Bar")).toBeInTheDocument();
      expect(screen.queryByText("Club Andino")).not.toBeInTheDocument();
    });

    it('switching to "Espacios" swaps the chips and filters the results', async () => {
      const user = userEvent.setup();
      renderWithActiveCity(<LugaresPage />);

      await waitFor(() => expect(screen.getAllByTestId("gastro-place-card").length).toBeGreaterThan(0));

      const selector = within(screen.getByTestId("lugares-grupo-selector"));
      await user.click(selector.getByRole("button", { name: /Espacios/ }));

      const chips = within(screen.getByTestId("gastro-type-chips"));
      expect(chips.getByText("Clubes")).toBeInTheDocument();
      expect(chips.queryByText("Bares")).not.toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("Club Andino")).toBeInTheDocument();
        expect(screen.queryByText("El Tinglado Bar")).not.toBeInTheDocument();
      });
    });
  });
});
