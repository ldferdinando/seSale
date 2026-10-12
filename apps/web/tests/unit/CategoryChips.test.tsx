import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { CategoryChips } from "@/features/events/components/CategoryChips";

function renderChips(ui: ReactElement) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>,
  );
}

// El mock de GET /api/categories trae 13 categorías ordenadas por sort_order.
describe("CategoryChips (collapsible)", () => {
  it("shows only the first 6 categories in catalog order plus a '+N más' chip", async () => {
    renderChips(<CategoryChips onChange={vi.fn()} />);

    expect(await screen.findByRole("button", { name: "+7 más" })).toHaveAttribute("aria-expanded", "false");
    for (const name of ["Música en vivo", "Fiesta / Baile", "Teatro", "Feria", "DJ / Electrónica", "Milonga / Tango"]) {
      expect(screen.getByRole("button", { name: new RegExp(name.replace("/", "\\/")) })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: /Peña folclórica/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Deportes/ })).not.toBeInTheDocument();
  });

  it("expands the rest and collapses again with 'Ver menos'", async () => {
    renderChips(<CategoryChips onChange={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: "+7 más" }));
    expect(screen.getByRole("button", { name: /Deportes/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Peña folclórica/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Ver menos/ }));
    expect(screen.queryByRole("button", { name: /Deportes/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+7 más" })).toBeInTheDocument();
  });

  it("starts expanded when the selected category is beyond the first 6", async () => {
    renderChips(<CategoryChips category="deportes" onChange={vi.fn()} />);

    expect(await screen.findByRole("button", { name: /Deportes/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ver menos/ })).toBeInTheDocument();
  });
});
