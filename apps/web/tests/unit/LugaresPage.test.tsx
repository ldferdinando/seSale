import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import LugaresPage from "@/app/lugares/page";
import { renderWithActiveCity } from "./test-utils";

describe("LugaresPage", () => {
  it("shows the type chips, horizontally scrollable", async () => {
    renderWithActiveCity(<LugaresPage />);

    const chips = await screen.findByTestId("gastro-type-chips");
    expect(chips.className).toContain("overflow-x-auto");
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
});
